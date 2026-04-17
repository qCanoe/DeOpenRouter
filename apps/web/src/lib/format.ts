export function shortenHex(value: string, head = 6, tail = 4): string {
  if (!value.startsWith("0x") || value.length <= 2 + head + tail) {
    return value;
  }
  return `${value.slice(0, 2 + head)}…${value.slice(-tail)}`;
}

export function formatUnixSeconds(ts: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(ts * 1000));
}
