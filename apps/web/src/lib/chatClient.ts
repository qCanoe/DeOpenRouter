export type ChatUsageBreakdown = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Present when relay forwards OpenRouter `usage.cost` (USD). */
  costUsd?: number;
  costDetails?: Record<string, unknown>;
};

export type ChatResult = {
  model: string;
  response: string;
  /** Sum of tokens for on-chain `usageUnits` (matches `usage.totalTokens` when breakdown exists). */
  usageUnits: bigint;
  /** OpenRouter / relay completion id when provided. */
  upstreamId?: string;
  /** Populated when relay returns structured `usage` (OpenRouter-accurate tokens). */
  usage?: ChatUsageBreakdown;
};

type ChatJson = {
  id?: string;
  model?: string;
  response?: string;
  usage?:
    | number
    | {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        cost?: number;
        cost_details?: Record<string, unknown>;
      };
  tokens?: number;
};

export async function postChat(
  baseUrl: string,
  prompt: string,
): Promise<ChatResult> {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/chat`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`chat_http_${res.status}: ${text}`);
  }
  const data = (await res.json()) as ChatJson;
  const model = typeof data.model === "string" ? data.model : "unknown";
  const response = typeof data.response === "string" ? data.response : "";

  const upstreamId =
    typeof data.id === "string" && data.id.length > 0 ? data.id : undefined;

  const u = data.usage;
  let usage: ChatUsageBreakdown | undefined;
  let usageUnits = 0n;

  if (typeof u === "object" && u !== null && !Array.isArray(u)) {
    const pt = typeof u.prompt_tokens === "number" ? Math.max(0, u.prompt_tokens) : 0;
    const ct =
      typeof u.completion_tokens === "number" ? Math.max(0, u.completion_tokens) : 0;
    const tt =
      typeof u.total_tokens === "number"
        ? Math.max(0, u.total_tokens)
        : pt + ct;
    usage = {
      promptTokens: pt,
      completionTokens: ct,
      totalTokens: tt,
      costUsd: typeof u.cost === "number" ? u.cost : undefined,
      costDetails:
        u.cost_details && typeof u.cost_details === "object"
          ? u.cost_details
          : undefined,
    };
    usageUnits = BigInt(tt);
  } else if (typeof u === "number") {
    usageUnits = BigInt(Math.max(0, Math.floor(u)));
  } else if (typeof data.tokens === "number") {
    usageUnits = BigInt(Math.max(0, Math.floor(data.tokens)));
  }

  return { model, response, usageUnits, upstreamId, usage };
}
