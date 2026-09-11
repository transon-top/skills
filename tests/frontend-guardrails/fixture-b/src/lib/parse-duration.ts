const UNITS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
};

export function parseDuration(input: string): number {
  const trimmed = input.trim().toLowerCase();
  if (trimmed.length === 0) {
    return 0;
  }

  const suffix = trimmed.slice(-1);
  const multiplier = UNITS[suffix] ?? 1;
  const numeric = suffix in UNITS ? trimmed.slice(0, -1) : trimmed;

  const parsed = Number.parseFloat(numeric);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.round(parsed * multiplier);
}

export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }

  return parts.length > 0 ? parts.join(" ") : "0m";
}
