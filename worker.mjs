export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ---- /api/chat : main chat endpoint ----
    if (pathname === "/api/chat" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const message = body.message || "";
      const sessionId = body.sessionId || "default";
      const modelKey = body.model || "fast"; // "fast" or "quality"

      const model =
        modelKey === "quality"
          ? "@cf/meta/llama-3.1-70b-instruct"
          : "@cf/meta/llama-3.1-8b-instruct";

      // 1. Load memory from KV
      let history = [];
      const kvKey = `session:${sessionId}`;
      const existing = await env.CHAT_MEMORY.get(kvKey);
      if (existing) {
        history = JSON.parse(existing);
      }

      history.push({ role: "user", content: message });

      // Create a compact text prompt from history
      const convo = history
        .slice(-10)
        .map((m) =>
          m.role === "user"
            ? `User: ${m.content}`
            : `Assistant: ${m.content}`
        )
        .join("\n");

      const prompt =
        "You are a concise, helpful assistant built on Cloudflare Workers AI. " +
        "Continue the conversation.\n\n" +
        convo +
        (convo ? "\n" : "") +
        "Assistant:";

      // 2. Call Workers AI
      const rawAnswer = await env.AI.run(model, { prompt });

      let reply;
      if (typeof rawAnswer === "string") reply = rawAnswer;
      else if (rawAnswer?.output_text) reply = rawAnswer.output_text;
      else if (rawAnswer?.response) reply = rawAnswer.response;
      else reply = "AI response format was unexpected.";

      history.push({ role: "assistant", content: reply });

      // 3. Save memory to KV
      await env.CHAT_MEMORY.put(kvKey, JSON.stringify(history), {
        expirationTtl: 60 * 60 * 3, // 3 hours
      });

      // 4. Fire-and-forget log to Durable Object
      if (env.SESSION_LOGGER) {
        const id = env.SESSION_LOGGER.idFromName(sessionId);
        const stub = env.SESSION_LOGGER.get(id);
        ctx.waitUntil(
          stub.fetch("https://logger/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              timestamp: Date.now(),
              messageLength: message.length,
              replyLength: reply.length,
              model,
            }),
          })
        );
      }

      return new Response(JSON.stringify({ reply }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ---- /api/summary : summarize conversation ----
    if (pathname === "/api/summary" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const sessionId = body.sessionId || "default";

      const kvKey = `session:${sessionId}`;
      const existing = await env.CHAT_MEMORY.get(kvKey);
      if (!existing) {
        return new Response(
          JSON.stringify({ summary: "No conversation yet." }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      const history = JSON.parse(existing);

      const convo = history
        .map((m) =>
          m.role === "user"
            ? `User: ${m.content}`
            : `Assistant: ${m.content}`
        )
        .join("\n");

      const prompt =
        "Summarize the following conversation in 4–6 bullet points. " +
        "Focus on key questions, answers, and decisions.\n\n" +
        convo;

      const raw = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
        prompt,
      });
      const summary =
        typeof raw === "string"
          ? raw
          : raw?.output_text || raw?.response || "No summary.";

      return new Response(JSON.stringify({ summary }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ---- /api/analytics : get basic stats from Durable Object ----
    if (pathname === "/api/analytics" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const sessionId = body.sessionId || "default";

      if (!env.SESSION_LOGGER) {
        return new Response(
          JSON.stringify({ error: "Analytics not configured" }),
          {
            headers: { "Content-Type": "application/json", ...corsHeaders },
            status: 500,
          }
        );
      }

      const id = env.SESSION_LOGGER.idFromName(sessionId);
      const stub = env.SESSION_LOGGER.get(id);
      const res = await stub.fetch("https://logger/session", {
        method: "GET",
      });
      const analytics = await res.json();

      return new Response(JSON.stringify(analytics), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fallback
    return new Response("Cloudflare AI Worker (chat + summary + analytics)", {
      status: 200,
      headers: corsHeaders,
    });
  },
};

// -------- Durable Object for simple session analytics --------
export class SessionLogger {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    if (pathname === "/session" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));

      const stored = (await this.state.storage.get("stats")) || {
        messages: 0,
        totalUserChars: 0,
        totalAssistantChars: 0,
        models: {},
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      stored.messages += 1;
      stored.totalUserChars += body.messageLength || 0;
      stored.totalAssistantChars += body.replyLength || 0;
      stored.updatedAt = Date.now();

      if (body.model) {
        stored.models[body.model] = (stored.models[body.model] || 0) + 1;
      }

      await this.state.storage.put("stats", stored);

      return new Response("OK");
    }

    if (pathname === "/session" && request.method === "GET") {
      const stored = (await this.state.storage.get("stats")) || {
        messages: 0,
        totalUserChars: 0,
        totalAssistantChars: 0,
        models: {},
        createdAt: null,
        updatedAt: null,
      };
      return new Response(JSON.stringify(stored), {
        headers: { "Content-Type": "application/json" },
      });
    }
            
    return new Response("Not found", { status: 404 });
  }
}
