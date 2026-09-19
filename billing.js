// TradeSquare — billing verification (LIVE PayPal)
// The browser never grants anything. It sends a PayPal order/subscription ID here;
// this function VERIFIES it with PayPal using the secret, then updates the database
// with the Supabase service-role key. That's what makes it tamper-proof.
//
// Env vars required in Netlify:
//   PAYPAL_CLIENT_ID              (from developer.paypal.com -> Live app)
//   PAYPAL_SECRET                 (from the same app -- SECRET, keep off the browser)
//   SUPABASE_SERVICE_ROLE_KEY     (already set)
//
// PAYPAL_ENV may be "live" (default) or "sandbox".

const SB_URL = "https://tbmxxlngxyxprqfwyudm.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibXh4bG5neHl4cHJxZnd5dWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MzU1NTEsImV4cCI6MjA5OTIxMTU1MX0.MVjIfxsPQrsa5788gZt0Mu1BC9O2XEnaP6NcXv_Avyc";

const PLAN_PRICE = { journeyman: "19.00", master: "49.00" };
const PLAN_IDS = { journeyman: "P-5UW396940S136072ANKW6KQI", master: "P-15401298XM3441021NKW6NUA" };
const CREDIT_PACK = { qty: 5, price: "9.00" };

function ppBase() {
  return (process.env.PAYPAL_ENV === "sandbox")
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const CID = process.env.PAYPAL_CLIENT_ID;
  const CSECRET = process.env.PAYPAL_SECRET;
  if (!SERVICE || !CID || !CSECRET) return json({ error: "Billing not fully configured on the server." }, 500);

  try {
    // Who is the logged-in user?
    const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Not logged in." }, 401);
    const ures = await fetch(SB_URL + "/auth/v1/user", { headers: { apikey: SB_ANON, authorization: "Bearer " + token } });
    if (!ures.ok) return json({ error: "Invalid session." }, 401);
    const uid = (await ures.json()).id;
    if (!uid) return json({ error: "Invalid session." }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // Get a PayPal access token
    const ppAuth = await fetch(ppBase() + "/v1/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + btoa(CID + ":" + CSECRET) },
      body: "grant_type=client_credentials",
    });
    if (!ppAuth.ok) return json({ error: "Could not reach PayPal." }, 502);
    const ppToken = (await ppAuth.json()).access_token;

    const svc = (path, opts) => fetch(SB_URL + path, Object.assign({
      headers: Object.assign({ apikey: SERVICE, authorization: "Bearer " + SERVICE, "Content-Type": "application/json" }, (opts && opts.headers) || {}),
    }, opts || {}));

    // ---- one-time credit pack: verify a captured ORDER ----
    if (action === "verify_order") {
      const orderId = String(body.orderID || "");
      if (!orderId) return json({ error: "Missing order id." }, 400);
      const ores = await fetch(ppBase() + "/v2/checkout/orders/" + orderId, { headers: { Authorization: "Bearer " + ppToken } });
      const order = await ores.json();
      const unit = order && order.purchase_units && order.purchase_units[0];
      const amt = unit && unit.amount && unit.amount.value;
      const captured = order && order.status === "COMPLETED";
      if (!captured) return json({ error: "Payment not completed." }, 400);
      if (amt !== CREDIT_PACK.price) return json({ error: "Amount mismatch." }, 400);

      // grant credits (read current, add pack)
      const prof = (await (await svc("/rest/v1/profiles?select=extra_takeoffs&id=eq." + uid)).json())[0] || { extra_takeoffs: 0 };
      const newBal = (prof.extra_takeoffs || 0) + CREDIT_PACK.qty;
      await svc("/rest/v1/profiles?id=eq." + uid, { method: "PATCH", body: JSON.stringify({ extra_takeoffs: newBal }) });
      return json({ ok: true, extra: newBal });
    }

    // ---- subscription: verify an ACTIVE subscription and set the plan ----
    if (action === "verify_subscription") {
      const subId = String(body.subscriptionID || "");
      const plan = String(body.plan || "");
      if (!subId || !PLAN_PRICE[plan]) return json({ error: "Missing subscription or plan." }, 400);
      const sres = await fetch(ppBase() + "/v1/billing/subscriptions/" + subId, { headers: { Authorization: "Bearer " + ppToken } });
      const sub = await sres.json();
      if (!sub || (sub.status !== "ACTIVE" && sub.status !== "APPROVED")) return json({ error: "Subscription not active." }, 400);
      // make sure the subscription is actually for the plan being claimed
      const expected = PLAN_IDS[plan];
      if (expected && sub.plan_id && sub.plan_id !== expected) {
        return json({ error: "Subscription plan mismatch." }, 400);
      }
      await svc("/rest/v1/profiles?id=eq." + uid, { method: "PATCH", body: JSON.stringify({ plan: plan, paypal_subscription_id: subId }) });
      return json({ ok: true, plan: plan });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json" } });
}
