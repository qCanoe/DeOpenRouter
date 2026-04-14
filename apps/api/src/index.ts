import { serve } from "@hono/node-server";
import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ ok: true }));

app.post("/v1/chat", async (c) => {
  let body: { prompt?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const prompt = typeof body.prompt === "string" ? body.prompt : "";
  const response = `echo:${prompt}`;
  return c.json({ model: "mock-mvp", response });
});

const port = Number(process.env.PORT ?? "8787");
serve({ fetch: app.fetch, port });
console.log(`[api] listening on http://127.0.0.1:${port}`);
