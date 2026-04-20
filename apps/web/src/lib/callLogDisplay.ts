import { REQUEST_FORMAT_V1, RESPONSE_FORMAT_V1 } from "@/lib/marketplaceAbi";

/** MVP: only `SETTLEMENT_SETTLED = 1` is emitted today. */
export function formatSettlementStatus(status: number | undefined): string {
  if (status === 1) return "Settled";
  if (status === undefined) return "—";
  return `Status ${status}`;
}

export function formatProtocolFormats(
  requestFormat: number | undefined,
  responseFormat: number | undefined,
): string {
  const rq =
    requestFormat === REQUEST_FORMAT_V1 ? "req v1" : requestFormat != null ? `req ${requestFormat}` : "—";
  const rs =
    responseFormat === RESPONSE_FORMAT_V1 ? "res v1" : responseFormat != null ? `res ${responseFormat}` : "—";
  return `${rq} · ${rs}`;
}

export function formatRecordedAt(recordedAt: bigint | undefined): string {
  if (recordedAt == null) return "—";
  return new Date(Number(recordedAt) * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}
