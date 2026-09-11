const SCALES: Record<string, number> = {
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
  const multiplier = SCALES[suffix] ?? 1;
  const numeric = suffix in SCALES ? trimmed.slice(0, -1) : trimmed;

  const parsed = Number.parseFloat(numeric);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.round(parsed * multiplier);
}
