import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { type Address, type Hex, zeroAddress } from "viem";
import { startAuditLoop } from "./auditLoop.js";

const OPENROUTER_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_HTTP_REFERER = process.env.OPENROUTER_HTTP_REFERER ?? "";
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE ?? "DeOpenRouter";

type OpenRouterChatResponse = {
  model?: string;
  choices?: Array<{ message?: { content?: string | null } }>;
  error?: { message?: string };
};

type ChatCompletionBody = {
  model?: string;
  messages?: Array<{ role?: string; content?: unknown }>;
  max_tokens?: number;
};

function lastUserText(messages: ChatCompletionBody["messages"]): string {
  if (!Array.isArray(messages)) return "";
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role === "user" && typeof m.content === "string") return m.content;
  }
  return "";
}

async function fetchOpenRouterChat(body: Record<string, unknown>): Promise<Response> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${OPENROUTER_API_KEY}`,
  };
  if (OPENROUTER_HTTP_REFERER) {
    headers["HTTP-Referer"] = OPENROUTER_HTTP_REFERER;
  }
  if (OPENROUTER_TITLE) {
    headers["X-Title"] = OPENROUTER_TITLE;
  }
  return fetch(OPENROUTER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

/** OpenAI-compatible POST body → OpenRouter or mock. */
async function handleChatCompletionJson(body: ChatCompletionBody) {
  const model = typeof body.model === "string" && body.model.length > 0 ? body.model : OPENROUTER_MODEL;
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const max_tokens = typeof body.max_tokens === "number" ? body.max_tokens : 512;

  if (!OPENROUTER_API_KEY) {
    const text = `echo:${lastUserText(messages)}`;
    return {
      id: "chatcmpl-mock",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "mock-mvp",
      choices: [
        {
          index: 0,
          message: { role: "assistant" as const, content: text },
          finish_reason: "stop" as const,
        },
      ],
    };
  }

  const upstream = await fetchOpenRouterChat({
    model,
    messages,
    max_tokens,
  });
  const raw = (await upstream.json()) as OpenRouterChatResponse;
  if (!upstream.ok) {
    const msg = raw.error?.message ?? upstream.statusText ?? "openrouter_error";
    return { _error: true as const, status: upstream.status, detail: msg };
  }
  return raw;
}

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.get("/health", (c) =>
  c.json({
    ok: true,
    mode: OPENROUTER_API_KEY ? "openrouter" : "mock_echo",
    model: OPENROUTER_API_KEY ? OPENROUTER_MODEL : "mock-mvp",
    audit: {
      scheduled: Number(process.env.AUDIT_INTERVAL_MS ?? "0") > 0,
    },
  }),
);

app.post("/v1/chat/completions", async (c) => {
  let body: ChatCompletionBody;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const out = await handleChatCompletionJson(body);
  if (out && typeof out === "object" && "_error" in out && out._error) {
    return c.json(
      { error: "openrouter_http", status: out.status, detail: out.detail },
      502,
    );
  }
  return c.json(out);
});

app.post("/v1/chat", async (c) => {
  let body: { prompt?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const prompt = typeof body.prompt === "string" ? body.prompt : "";

  if (!OPENROUTER_API_KEY) {
    const response = `echo:${prompt}`;
    return c.json({ model: "mock-mvp", response });
  }

  let upstream: Response;
  try {
    upstream = await fetchOpenRouterChat({
      model: OPENROUTER_MODEL,
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "upstream_fetch_failed";
    return c.json({ error: "openrouter_unreachable", detail: msg }, 502);
  }

  const raw = (await upstream.json()) as OpenRouterChatResponse;
  if (!upstream.ok) {
    const msg = raw.error?.message ?? upstream.statusText ?? "openrouter_error";
    return c.json({ error: "openrouter_http", status: upstream.status, detail: msg }, 502);
  }

  const text = raw.choices?.[0]?.message?.content ?? "";
  const model = typeof raw.model === "string" && raw.model.length > 0 ? raw.model : OPENROUTER_MODEL;

  return c.json({ model, response: text });
});

const port = Number(process.env.PORT ?? "8787");
serve({ fetch: app.fetch, port });
console.log(`[api] listening on http://127.0.0.1:${port}`);
console.log(
  OPENROUTER_API_KEY
    ? `[api] OpenRouter enabled (model=${OPENROUTER_MODEL})`
    : "[api] OPENROUTER_API_KEY unset — using mock echo; set key for live OpenRouter",
);

const auditInterval = Number(process.env.AUDIT_INTERVAL_MS ?? "0");
const auditServerUrl = process.env.AUDIT_SERVER_URL ?? "";
const auditRelayBaseUrl = process.env.AUDIT_RELAY_BASE_URL ?? `http://127.0.0.1:${port}`;
const marketplaceAddress = (process.env.MARKETPLACE_ADDRESS ?? "") as Address;
const rpcUrl = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
const auditPk = (process.env.AUDIT_PRIVATE_KEY ?? "") as Hex;
const providerId = BigInt(process.env.AUDIT_PROVIDER_ID ?? "0");
const auditTimeoutSec = Number(process.env.AUDIT_TIMEOUT_SEC ?? "120");

if (auditInterval > 0) {
  if (
    !auditServerUrl ||
    !marketplaceAddress ||
    marketplaceAddress === zeroAddress ||
    !auditPk ||
    auditPk.length < 64
  ) {
    console.warn(
      "[audit] AUDIT_INTERVAL_MS set but missing AUDIT_SERVER_URL, MARKETPLACE_ADDRESS, or AUDIT_PRIVATE_KEY — scheduler disabled",
    );
  } else if (!OPENROUTER_API_KEY) {
    console.warn("[audit] OPENROUTER_API_KEY required for meaningful audit — scheduler disabled");
  } else {
    startAuditLoop({
      auditServerUrl,
      auditRelayBaseUrl,
      openrouterApiKey: OPENROUTER_API_KEY,
      openrouterModel: OPENROUTER_MODEL,
      providerId,
      marketplaceAddress,
      rpcUrl,
      privateKey: auditPk.startsWith("0x") ? auditPk : (`0x${auditPk}` as Hex),
      intervalMs: auditInterval,
      auditTimeoutSec,
    });
  }
}
