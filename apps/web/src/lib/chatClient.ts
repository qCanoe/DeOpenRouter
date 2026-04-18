export type ChatResult = {
  model: string;
  response: string;
  /** Optional token or unit count for on-chain `usageUnits` (defaults to 0). */
  usageUnits: bigint;
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
  const data = (await res.json()) as {
    model?: string;
    response?: string;
    usage?: number;
    tokens?: number;
  };
  const model = typeof data.model === "string" ? data.model : "unknown";
  const response = typeof data.response === "string" ? data.response : "";
  const raw =
    typeof data.usage === "number"
      ? data.usage
      : typeof data.tokens === "number"
        ? data.tokens
        : 0;
  const usageUnits = BigInt(Math.max(0, Math.floor(raw)));
  return { model, response, usageUnits };
}
