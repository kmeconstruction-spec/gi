// TradeSquare — shared serverless answer proxy
// Keeps your Anthropic API key OFF the browser. The site posts
// { system, messages, tools?, model? } here; this adds the key server-side,
// calls Anthropic, and returns { text }.
//
// - Chat & invoice pages send { system, messages }  -> normal answer.
// - Materials price lookup also sends tools:[web_search] for live pricing.
//
// Set ANTHROPIC_API_KEY in Netlify: Site configuration -> Environment variables.

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: { message: "POST only" } }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { system, messages, tools, model } = await req.json();

    const payload = {
      model: model || "claude-sonnet-5",   // swap for claude-haiku-4-5-20251001 to cut cost
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

    if (data.error) {
      return new Response(JSON.stringify({ error: data.error }), {
        status: 502, headers: { "Content-Type": "application/json" },
      });
    }

    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: { message: String(e) } }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }
};
