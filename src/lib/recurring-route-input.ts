const MAX_SIGNED_BIGINT = BigInt('9223372036854775807');

export function parseRecurringId(value: string): bigint | null {
  if (!/^[1-9]\d{0,18}$/.test(value)) return null;
  const parsed = BigInt(value);
  return parsed <= MAX_SIGNED_BIGINT ? parsed : null;
}

export function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
