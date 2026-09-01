// Bytes as a player-readable size. Decimal units, so 1 MB is 1,000,000 bytes.
export function formatBytes(bytes: number): string {
  if (bytes < 1_000_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
