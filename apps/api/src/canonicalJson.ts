/**
 * Deterministic JSON serialization for cross-language audit report hashing.
 * Objects have keys sorted lexicographically; arrays preserve order.
 * Matches `deopenrouter_audit.canonical.canonical_dumps` in Python.
 */
export function canonicalStringify(value: unknown): string {
  if (value === null) {
    return "null";
  }
  const t = typeof value;
  if (t === "number" || t === "boolean") {
    return JSON.stringify(value);
  }
  if (t === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "bigint") {
    return JSON.stringify(value.toString());
  }
  if (t === "undefined") {
    return "null";
  }
  if (Array.isArray(value)) {
    const parts = value.map((v) => canonicalStringify(v ?? null));
    return `[${parts.join(",")}]`;
  }
  if (t === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    const props = keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(obj[k])}`);
    return `{${props.join(",")}}`;
  }
  return JSON.stringify(String(value));
}
