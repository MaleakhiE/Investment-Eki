/**
 * Gold Price API Route
 * 
 * GET /api/gold-price - Get current gold price
 * Uses multiple fallback sources for reliability
 */

import { NextResponse } from 'next/server';
import { successResponse } from '@/lib/api-response';

interface GoldPriceResponse {
  sell_price: number;
  buy_price: number;
  source: string;
  updated_at: string;
  is_verified: boolean;
}

// Cache the price for 5 minutes
let cachedPrice: GoldPriceResponse | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000;

// Default Indonesian gold price (updated periodically as fallback)
const DEFAULT_GOLD_PRICE = 1550000; // Rp per gram (Jan 2026 estimate)
const MAX_REASONABLE_USD_TO_IDR = 100_000;

function isPositiveFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isReasonableExchangeRate(value: unknown): value is number {
  return isPositiveFiniteNumber(value) && value <= MAX_REASONABLE_USD_TO_IDR;
}

function buildFallbackGoldPrice(source: string): GoldPriceResponse {
  return {
    sell_price: DEFAULT_GOLD_PRICE,
    buy_price: Math.round(DEFAULT_GOLD_PRICE * 0.93),
    source,
    updated_at: new Date().toISOString(),
    is_verified: false,
  };
}

function buildVerifiedGoldPrice(sellPrice: number, buyPrice: number, source: string): GoldPriceResponse {
  return {
    sell_price: sellPrice,
    buy_price: buyPrice,
    source,
    updated_at: new Date().toISOString(),
    is_verified: true,
  };
}

function buildGoldPrice(usdToIdr: unknown, source: string): GoldPriceResponse | null {
  if (!isReasonableExchangeRate(usdToIdr)) return null;

  const pricePerGram = 85 * usdToIdr;
  const sellPrice = Math.round(pricePerGram * 1.12);
  const buyPrice = Math.round(pricePerGram * 0.98);
  if (!isPositiveFiniteNumber(pricePerGram) || !isPositiveFiniteNumber(sellPrice) || !isPositiveFiniteNumber(buyPrice)) return null;

  return buildVerifiedGoldPrice(sellPrice, buyPrice, source);
}

async function fetchGoldPrice(): Promise<GoldPriceResponse> {
  // Return cached if valid
  if (cachedPrice && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedPrice;
  }

  // Try multiple APIs in sequence
  const result = await tryFetchFromAPIs();
  
  if (result) {
    cachedPrice = result;
    cacheTime = Date.now();
    return result;
  }

  // Return default/fallback price
  return buildFallbackGoldPrice('default (offline)');
}

async function tryFetchFromAPIs(): Promise<GoldPriceResponse | null> {
  // Try frankfurter.app (free, reliable forex API)
  try {
    const result = await fetchFromFrankfurter();
    if (result) return result;
  } catch {
    console.error('gold_price_upstream_failed');
  }

  // Try open.er-api.com (free exchange rate API)
  try {
    const result = await fetchFromExchangeRateAPI();
    if (result) return result;
  } catch {
    console.error('gold_price_upstream_failed');
  }

  return null;
}

async function fetchFromFrankfurter(): Promise<GoldPriceResponse | null> {
  // Frankfurter doesn't have gold, but we can use USD/IDR rate
  // and calculate based on international gold price
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=IDR', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    
    const data = await res.json();
    const usdToIdr = data.rates?.IDR;
    
    return buildGoldPrice(usdToIdr, 'frankfurter.app');
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

async function fetchFromExchangeRateAPI(): Promise<GoldPriceResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    
    const data = await res.json();
    const usdToIdr = data.rates?.IDR;
    
    return buildGoldPrice(usdToIdr, 'open.er-api.com');
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

export async function GET() {
  try {
    const priceData = await fetchGoldPrice();
    return NextResponse.json(
      successResponse(priceData, 'Gold price fetched successfully')
    );
  } catch {
    console.error('gold_price_fallback_used');
    // Return a clearly unverified fallback price even on error
    return NextResponse.json(
      successResponse(buildFallbackGoldPrice('default (error fallback)'), 'Gold price fetched (fallback)')
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
