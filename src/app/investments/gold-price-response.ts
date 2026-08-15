export interface GoldPriceResponseData {
  sell_price: number;
  source: string;
  updated_at: string;
  is_verified: boolean;
}

export function parseGoldPriceResponse(value: unknown): GoldPriceResponseData | null {
  if (!value || typeof value !== 'object' || !('responseStatus' in value) || value.responseStatus !== 'SUCCESS' || !('responseDetails' in value)) return null;
  const details = value.responseDetails;
  if (!details || typeof details !== 'object') return null;
  const { sell_price, source, updated_at, is_verified } = details as Record<string, unknown>;
  if (typeof sell_price !== 'number' || !Number.isFinite(sell_price) || sell_price <= 0) return null;
  if (typeof source !== 'string' || source.length === 0 || typeof updated_at !== 'string' || updated_at.length === 0) return null;
  if (typeof is_verified !== 'boolean') return null;
  return { sell_price, source, updated_at, is_verified };
}
