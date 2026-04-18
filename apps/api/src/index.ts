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
  id?: string;
  object?: string;
  created?: number;
  model?: string;
  choices?: Array<{
    index?: number;
    finish_reason?: string | null;
    message?: { role?: string; content?: string | null };
  }>;
  error?: { message?: string };
  usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
};

type UpstreamFailure = {
  _error: true;
  error: "openrouter_unreachable" | "openrouter_http" | "openrouter_invalid_json";
  status: number;
  detail: string;
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

async function parseOpenRouterJson(
  response: Response,
): Promise<OpenRouterChatResponse | null> {
  try {
    return (await response.json()) as OpenRouterChatResponse;
  } catch {
    return null;
  }
}

async function handleChatCompletionJson(
  body: ChatCompletionBody,
): Promise<OpenRouterChatResponse | UpstreamFailure> {
  const model =
    typeof body.model === "string" && body.model.length > 0
      ? body.model
      : OPENROUTER_MODEL;
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

  let upstream: Response;
  try {
    upstream = await fetchOpenRouterChat({
      model,
      messages,
      max_tokens,
    });
  } catch (e) {
    return {
      _error: true,
      error: "openrouter_unreachable",
      status: 502,
      detail: e instanceof Error ? e.message : "upstream_fetch_failed",
    };
  }

  const raw = await parseOpenRouterJson(upstream);
  if (!raw) {
    return {
      _error: true,
      error: "openrouter_invalid_json",
      status: 502,
      detail: "OpenRouter returned non-JSON output.",
    };
  }

  if (!upstream.ok) {
    const msg = raw.error?.message ?? upstream.statusText ?? "openrouter_error";
    return {
      _error: true,
      error: "openrouter_http",
      status: upstream.status,
      detail: msg,
    };
  }

  return raw;
}

function normalizePrivateKey(value: string): Hex | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`;
  return /^0x[a-fA-F0-9]{64}$/.test(normalized) ? (normalized as Hex) : null;
}

const port = Number(process.env.PORT ?? "8787");
const auditInterval = Number(process.env.AUDIT_INTERVAL_MS ?? "0");
const auditServerUrl = process.env.AUDIT_SERVER_URL ?? "";
const auditRelayBaseUrl = process.env.AUDIT_RELAY_BASE_URL ?? `http://127.0.0.1:${port}`;
const marketplaceAddress = (process.env.MARKETPLACE_ADDRESS ?? "") as Address;
const rpcUrl = process.env.CHAIN_RPC_URL ?? "http://127.0.0.1:8545";
const auditPk = normalizePrivateKey(process.env.AUDIT_PRIVATE_KEY ?? "");
const providerId = BigInt(process.env.AUDIT_PROVIDER_ID ?? "0");
const auditTimeoutSec = Number(process.env.AUDIT_TIMEOUT_SEC ?? "120");

function getAuditHealth() {
  const requested = auditInterval > 0;

  if (!requested) {
    return {
      requested,
      scheduled: false,
      reason: "AUDIT_INTERVAL_MS not set.",
    };
  }

  if (!auditServerUrl) {
    return {
      requested,
      scheduled: false,
      reason: "AUDIT_SERVER_URL missing.",
    };
  }

  if (!marketplaceAddress || marketplaceAddress === zeroAddress) {
    return {
      requested,
      scheduled: false,
      reason: "MARKETPLACE_ADDRESS missing or zero address.",
    };
  }

  if (!auditPk) {
    return {
      requested,
      scheduled: false,
      reason: "AUDIT_PRIVATE_KEY missing or invalid.",
    };
  }

  if (!OPENROUTER_API_KEY) {
    return {
      requested,
      scheduled: false,
      reason: "OPENROUTER_API_KEY missing.",
    };
  }

  return {
    requested,
    scheduled: true,
    reason: null,
  };
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
    audit: getAuditHealth(),
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
  if ("_error" in out && out._error) {
    return c.json({ error: out.error, status: out.status, detail: out.detail }, 502);
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
    const usage = Math.max(1, prompt.length);
    return c.json({ model: "mock-mvp", response, usage });
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

  const raw = await parseOpenRouterJson(upstream);
  if (!raw) {
    return c.json(
      {
        error: "openrouter_invalid_json",
        status: upstream.status,
        detail: "OpenRouter returned non-JSON output.",
      },
      502,
    );
  }

  if (!upstream.ok) {
    const msg = raw.error?.message ?? upstream.statusText ?? "openrouter_error";
    return c.json({ error: "openrouter_http", status: upstream.status, detail: msg }, 502);
  }

  const text = raw.choices?.[0]?.message?.content ?? "";
  const model =
    typeof raw.model === "string" && raw.model.length > 0
      ? raw.model
      : OPENROUTER_MODEL;
  const usage =
    typeof raw.usage?.total_tokens === "number"
      ? raw.usage.total_tokens
      : typeof raw.usage?.prompt_tokens === "number" &&
          typeof raw.usage?.completion_tokens === "number"
        ? raw.usage.prompt_tokens + raw.usage.completion_tokens
        : undefined;

  return c.json({ model, response: text, ...(usage !== undefined ? { usage } : {}) });
});

serve({ fetch: app.fetch, port });
console.log(`[api] listening on http://127.0.0.1:${port}`);
console.log(
  OPENROUTER_API_KEY
    ? `[api] OpenRouter enabled (model=${OPENROUTER_MODEL})`
    : "[api] OPENROUTER_API_KEY unset - using mock echo; set key for live OpenRouter",
);

const auditHealth = getAuditHealth();
if (auditHealth.scheduled) {
  startAuditLoop({
    auditServerUrl,
    auditRelayBaseUrl,
    openrouterApiKey: OPENROUTER_API_KEY,
    openrouterModel: OPENROUTER_MODEL,
    providerId,
    marketplaceAddress,
    rpcUrl,
    privateKey: auditPk!,
    intervalMs: auditInterval,
    auditTimeoutSec,
  });
} else if (auditHealth.requested) {
  console.warn(`[audit] scheduler disabled: ${auditHealth.reason}`);
}
