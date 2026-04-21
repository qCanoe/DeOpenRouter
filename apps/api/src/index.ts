import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  createPublicClient,
  defineChain,
  http,
  isHex,
  parseAbiItem,
  parseEventLogs,
  type Address,
  type Hex,
  zeroAddress,
} from "viem";
import { getCachedAuditReport } from "./auditReportCache.js";
import { runAuditOnce, startAuditLoop } from "./auditLoop.js";

const OPENROUTER_URL =
  process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "";
const OPENROUTER_HTTP_REFERER = process.env.OPENROUTER_HTTP_REFERER ?? "";
const OPENROUTER_TITLE = process.env.OPENROUTER_TITLE ?? "DeOpenRouter";

type OpenRouterUsage = {
  total_tokens?: number;
  prompt_tokens?: number;
  completion_tokens?: number;
  /** USD charged (OpenRouter includes this on many models). */
  cost?: number;
  cost_details?: Record<string, unknown>;
};

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
  usage?: OpenRouterUsage;
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

/** Normalize OpenRouter `usage` for `POST /v1/chat` (accurate when upstream sends token fields). */
function usagePayloadForSimpleChat(
  rawUsage: OpenRouterUsage | undefined,
  prompt: string,
  responseText: string,
): {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost?: number;
  cost_details?: Record<string, unknown>;
} {
  const approxPt = Math.max(0, Math.ceil(prompt.length / 4));
  const approxCt = Math.max(0, Math.ceil(responseText.length / 4));

  let pt = typeof rawUsage?.prompt_tokens === "number" ? rawUsage.prompt_tokens : undefined;
  let ct = typeof rawUsage?.completion_tokens === "number" ? rawUsage.completion_tokens : undefined;
  let tt = typeof rawUsage?.total_tokens === "number" ? rawUsage.total_tokens : undefined;

  if (pt !== undefined && ct !== undefined) {
    tt = tt ?? pt + ct;
  } else if (tt !== undefined) {
    if (pt !== undefined) ct = Math.max(0, tt - pt);
    else if (ct !== undefined) pt = Math.max(0, tt - ct);
    else {
      pt = approxPt;
      ct = Math.max(0, tt - pt);
    }
  } else if (pt !== undefined) {
    ct = approxCt;
    tt = pt + ct;
  } else if (ct !== undefined) {
    pt = approxPt;
    tt = pt + ct;
  } else {
    pt = approxPt;
    ct = approxCt;
    tt = pt + ct;
  }

  const out: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost?: number;
    cost_details?: Record<string, unknown>;
  } = {
    prompt_tokens: pt,
    completion_tokens: ct,
    total_tokens: tt,
  };

  if (typeof rawUsage?.cost === "number") out.cost = rawUsage.cost;
  if (rawUsage?.cost_details && typeof rawUsage.cost_details === "object") {
    out.cost_details = rawUsage.cost_details as Record<string, unknown>;
  }
  return out;
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
    const userText = lastUserText(messages);
    const text = `echo:${userText}`;
    const pt = Math.max(0, Math.ceil(userText.length / 4));
    const ct = Math.max(0, Math.ceil(text.length / 4));
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
      usage: {
        prompt_tokens: pt,
        completion_tokens: ct,
        total_tokens: pt + ct,
      },
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
const chainId = Number(process.env.CHAIN_ID ?? "31337");
const auditPk = normalizePrivateKey(process.env.AUDIT_PRIVATE_KEY ?? "");
const providerId = BigInt(process.env.AUDIT_PROVIDER_ID ?? "0");
const auditTimeoutSec = Number(process.env.AUDIT_TIMEOUT_SEC ?? "120");

const providerRegisteredEvent = parseAbiItem(
  "event ProviderRegistered(uint256 indexed id, address indexed owner, string modelId, string modelVersion, bytes32 endpointCommitment, bytes32 capabilityHash, uint256 pricePerCall, uint256 stakeLockBlocks, uint256 stake, string metadataURI, bytes32 metadataHash, bytes32 identityHash, uint256 createdAtBlock)",
);

/** Same env as scheduled audit, minus `AUDIT_INTERVAL_MS` — used for POST /v1/audit/trigger after register. */
function getAuditRunBaseConfig():
  | Parameters<typeof runAuditOnce>[0]
  | null {
  if (!auditServerUrl) return null;
  if (!marketplaceAddress || marketplaceAddress === zeroAddress) return null;
  if (!auditPk) return null;
  return {
    auditServerUrl,
    auditRelayBaseUrl,
    openrouterApiKey: OPENROUTER_API_KEY,
    openrouterModel: OPENROUTER_MODEL,
    marketplaceAddress,
    rpcUrl,
    chainId,
    privateKey: auditPk,
    auditTimeoutSec,
    providerId: 0n,
  };
}

const auditChain = defineChain({
  id: chainId,
  name: "deopenrouter",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

const publicClient = createPublicClient({
  chain: auditChain,
  transport: http(rpcUrl),
});

const processedRegisterAuditTx = new Set<string>();

function getAuditHealth() {
  const requested = auditInterval > 0;

  if (!requested) {
    return {
      requested,
      scheduled: false,
      reason: "AUDIT_INTERVAL_MS not set.",
      chainId,
    };
  }

  if (!auditServerUrl) {
    return {
      requested,
      scheduled: false,
      reason: "AUDIT_SERVER_URL missing.",
      chainId,
    };
  }

  if (!marketplaceAddress || marketplaceAddress === zeroAddress) {
    return {
      requested,
      scheduled: false,
      reason: "MARKETPLACE_ADDRESS missing or zero address.",
      chainId,
    };
  }

  if (!auditPk) {
    return {
      requested,
      scheduled: false,
      reason: "AUDIT_PRIVATE_KEY missing or invalid.",
      chainId,
    };
  }

  if (!OPENROUTER_API_KEY) {
    return {
      requested,
      scheduled: false,
      reason: "OPENROUTER_API_KEY missing.",
      chainId,
    };
  }

  return {
    requested,
    scheduled: true,
    reason: null,
    chainId,
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
    audit: {
      ...getAuditHealth(),
      onDemandReady: getAuditRunBaseConfig() !== null,
    },
  }),
);

/** Full audit JSON keyed by report hash (in-memory, this relay process only). */
app.get("/v1/audit/cached-report", (c) => {
  const q = c.req.query("hash");
  const raw = typeof q === "string" ? q.trim() : "";
  if (!raw || !isHex(raw)) {
    return c.json({ error: "invalid_hash" }, 400);
  }
  const canonical = getCachedAuditReport(raw as Hex);
  if (!canonical) {
    return c.json(
      {
        error: "not_found",
        detail:
          "No cached report for this hash on this relay (restart clears cache; audits from other relays are not available).",
      },
      404,
    );
  }
  try {
    const report = JSON.parse(canonical) as Record<string, unknown>;
    return c.json({ ok: true, report });
  } catch {
    return c.json({ ok: true, reportRaw: canonical });
  }
});

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
    const usage = usagePayloadForSimpleChat(undefined, prompt, response);
    return c.json({
      id: `mock-echo-${Date.now()}`,
      model: "mock-mvp",
      response,
      usage,
    });
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
  const usage = usagePayloadForSimpleChat(raw.usage, prompt, text);
  const upstreamId = typeof raw.id === "string" && raw.id.length > 0 ? raw.id : undefined;

  return c.json({
    ...(upstreamId ? { id: upstreamId } : {}),
    model,
    response: text,
    usage,
  });
});

/**
 * After a successful `register` tx, the web UI POSTs the tx hash. We decode `ProviderRegistered`
 * and run one audit for that provider id (same pipeline as the scheduled loop).
 */
app.post("/v1/audit/trigger", async (c) => {
  const base = getAuditRunBaseConfig();
  if (!base) {
    return c.json(
      {
        error: "audit_unavailable",
        detail:
          "Set AUDIT_SERVER_URL, MARKETPLACE_ADDRESS, and AUDIT_PRIVATE_KEY (same as contract deployer / auditRecorder). OPENROUTER_API_KEY is optional when the relay runs in echo mode.",
      },
      503,
    );
  }

  let body: { transactionHash?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const txHash = typeof body.transactionHash === "string" ? body.transactionHash.trim() : "";
  if (!txHash || !isHex(txHash)) {
    return c.json({ error: "invalid_transaction_hash" }, 400);
  }

  if (processedRegisterAuditTx.has(txHash.toLowerCase())) {
    return c.json({ ok: true, duplicate: true, transactionHash: txHash as Hex });
  }

  const receipt = await publicClient.getTransactionReceipt({ hash: txHash as Hex });
  if (receipt.status !== "success") {
    return c.json({ error: "transaction_reverted" }, 400);
  }

  const marketplaceLogs = receipt.logs.filter(
    (log) => log.address.toLowerCase() === marketplaceAddress.toLowerCase(),
  );

  let parsed;
  try {
    parsed = parseEventLogs({
      abi: [providerRegisteredEvent],
      logs: marketplaceLogs,
      eventName: "ProviderRegistered",
    });
  } catch {
    return c.json({ error: "decode_logs_failed" }, 400);
  }

  if (parsed.length === 0) {
    return c.json({ error: "provider_registered_event_not_found" }, 400);
  }

  const newProviderId = parsed[0].args.id as bigint;
  processedRegisterAuditTx.add(txHash.toLowerCase());

  const result = await runAuditOnce({ ...base, providerId: newProviderId });
  if (!result.ok) {
    return c.json(
      {
        error: "audit_failed",
        detail: result.error,
        providerId: newProviderId.toString(),
      },
      502,
    );
  }

  return c.json({
    ok: true,
    providerId: newProviderId.toString(),
    recordTxHash: result.recordTxHash,
    registrationTxHash: txHash,
  });
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
    chainId,
    privateKey: auditPk!,
    intervalMs: auditInterval,
    auditTimeoutSec,
  });
} else if (auditHealth.requested) {
  console.warn(`[audit] scheduler disabled: ${auditHealth.reason}`);
}
