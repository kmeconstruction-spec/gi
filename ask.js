// TradeSquare — shared serverless answer proxy + plan limits
// Keeps your Anthropic key server-side, and enforces the free daily limit
// for logged-in users (paid plans are unlimited).
//
// Env var required in Netlify: ANTHROPIC_API_KEY

const SB_URL = "https://tbmxxlngxyxprqfwyudm.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRibXh4bG5neHl4cHJxZnd5dWRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2MzU1NTEsImV4cCI6MjA5OTIxMTU1MX0.MVjIfxsPQrsa5788gZt0Mu1BC9O2XEnaP6NcXv_Avyc";
const FREE_DAILY_LIMIT = 5;   // Apprentice: searches per day. Bump this any time.

export default async (req) => {
  if (req.method !== "POST") {
    return json({ error: { message: "POST only" } }, 405);
  }

  try {
    // ---- plan / usage limit (only applies to logged-in users) ----
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      const blockedMsg = await overLimit(token);
      if (blockedMsg) return json({ error: { message: blockedMsg } }, 429);
    }

    const { system, messages, tools, model } = await req.json();

    const payload = {
      model: model || "claude-sonnet-5",
      max_tokens: 1200,
      messages,
    };
    if (system) payload.system = system;
    if (Array.isArray(tools) && tools.length) payload.tools = tools;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    if (data.error) return json({ error: data.error }, 502);

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return json({ text });
  } catch (e) {
    return json({ error: { message: String(e) } }, 500);
  }
};

// Returns a message string if the user is over their limit, else null.
// Fails OPEN (returns null) on any error so we never block a paying user.
async function overLimit(token) {
  try {
    const pr = await fetch(SB_URL + "/rest/v1/profiles?select=plan", {
      headers: { apikey: SB_ANON, authorization: "Bearer " + token },
    });
    if (!pr.ok) return null;
    const rows = await pr.json();
    const plan = (Array.isArray(rows) && rows[0] && rows[0].plan) || "apprentice";
    if (plan === "journeyman" || plan === "master") return null; // unlimited

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const url = SB_URL + "/rest/v1/searches?select=id&created_at=gte." +
      encodeURIComponent(since.toISOString()) + "&limit=1";
    const cr = await fetch(url, {
      headers: { apikey: SB_ANON, authorization: "Bearer " + token, prefer: "count=exact" },
    });
    const range = cr.headers.get("content-range") || "";
    const total = parseInt(range.split("/")[1] || "0", 10) || 0;

    if (total >= FREE_DAILY_LIMIT) {
      return "You've used your " + FREE_DAILY_LIMIT +
        " free searches for today. Upgrade on the Pricing page for unlimited answers.";
    }
    return null;
  } catch (e) {
    return null; // fail open
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}
