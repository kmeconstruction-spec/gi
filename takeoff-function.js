// TradeSquare — takeoff meter (Master-gated, 6 free takeoffs/month + credits)
// Uses the Supabase SERVICE ROLE key so users can't tamper with the meter.
//
// Env vars required in Netlify:
//   SUPABASE_SERVICE_ROLE_KEY   (Supabase → Project settings → API → service_role secret)

const SB_URL = "https://tbmxxlngxyxprqfwyudm.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibXh4bG5neHl4cHJxZnd5dWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MzU1NTEsImV4cCI6MjA5OTIxMTU1MX0.MVjIfxsPQrsa5788gZt0Mu1BC9O2XEnaP6NcXv_Avyc";
const MONTHLY_FREE = 6;

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SERVICE) return json({ error: "Server not configured (missing service role key)." }, 500);

  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Not logged in." }, 401);

    // Verify the user by asking Supabase who the token belongs to
    const ures = await fetch(SB_URL + "/auth/v1/user", {
      headers: { apikey: SB_ANON, authorization: "Bearer " + token },
    });
    if (!ures.ok) return json({ error: "Invalid session." }, 401);
    const user = await ures.json();
    const uid = user && user.id;
    if (!uid) return json({ error: "Invalid session." }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "status";

    const svc = (path, opts) => fetch(SB_URL + path, Object.assign({
      headers: Object.assign({ apikey: SERVICE, authorization: "Bearer " + SERVICE, "Content-Type": "application/json" }, (opts && opts.headers) || {}),
    }, opts || {}));

    // Load plan + credit balance
    const pr = await svc("/rest/v1/profiles?select=plan,extra_takeoffs&id=eq." + uid);
    const prof = (await pr.json())[0] || { plan: "apprentice", extra_takeoffs: 0 };
    const isMaster = prof.plan === "master";
    const extra = prof.extra_takeoffs || 0;

    // Count this calendar month's runs
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    const cr = await svc("/rest/v1/takeoff_runs?select=id&user_id=eq." + uid + "&created_at=gte." + encodeURIComponent(monthStart) + "&limit=1", { headers: { Prefer: "count=exact" } });
    const used = parseInt((cr.headers.get("content-range") || "").split("/")[1] || "0", 10) || 0;

    if (action === "status") {
      return json({ plan: prof.plan, master: isMaster, used, base: MONTHLY_FREE, extra });
    }

    if (action === "add_credits") {
      // NOTE: for production, verify the PayPal order server-side before granting credits.
      const n = Math.max(1, Math.min(100, parseInt(body.n, 10) || 0));
      await svc("/rest/v1/profiles?id=eq." + uid, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ extra_takeoffs: extra + n }) });
      return json({ ok: true, extra: extra + n });
    }

    if (action === "authorize") {
      if (!isMaster) return json({ ok: false, reason: "not_master" });
      if (used < MONTHLY_FREE) {
        await svc("/rest/v1/takeoff_runs", { method: "POST", body: JSON.stringify({ user_id: uid }) });
        return json({ ok: true, source: "monthly", used: used + 1, base: MONTHLY_FREE, extra });
      }
      if (extra > 0) {
        await svc("/rest/v1/profiles?id=eq." + uid, { method: "PATCH", body: JSON.stringify({ extra_takeoffs: extra - 1 }) });
        await svc("/rest/v1/takeoff_runs", { method: "POST", body: JSON.stringify({ user_id: uid }) });
        return json({ ok: true, source: "credit", used: used + 1, base: MONTHLY_FREE, extra: extra - 1 });
      }
      return json({ ok: false, reason: "limit", used, base: MONTHLY_FREE, extra: 0 });
    }

    return json({ error: "Unknown action." }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
};

function json(obj, status) {
  return new Response(JSON.stringify(obj), { status: status || 200, headers: { "Content-Type": "application/json" } });
}
