export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase().replace(/\s+/g, "-")}`}>{status}</span>;
}

export function ResultBadge({ result }: { result?: string }) {
  const value = result || "Pending";
  return <span className={`result-badge result-${value.toLowerCase()}`}>{value}</span>;
}
