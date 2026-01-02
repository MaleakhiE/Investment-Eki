/**
 * Gold Price API Route
 * 
 * GET /api/gold-price - Get current gold price from external API
 * 
 * Uses logam-mulia-api or fallback to static price
 */

import { NextResponse } from 'next/server';
import { successResponse, serverErrorResponse } from '@/lib/api-response';

interface GoldPriceResponse {
  sell_price: number;  // Harga jual (untuk beli emas)
  buy_price: number;   // Harga beli (untuk jual emas)
  source: string;
  updated_at: string;
}

// Cache the price for 5 minutes to avoid too many API calls
let cachedPrice: GoldPriceResponse | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function fetchGoldPrice(): Promise<GoldPriceResponse> {
  // Check cache first
  if (cachedPrice && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedPrice;
  }

  try {
    // Try to fetch from harga-emas.org API (scraping alternative)
    // Using a public gold price API
    const response = await fetch('https://logam-mulia-api.vercel.app/prices/hargaemas-org', {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (response.ok) {
      const data = await response.json();
      
      // Parse the response - structure may vary
      if (data && data.data) {
        const goldData = data.data;
        // Find Antam gold price (usually the most common reference)
        const antamPrice = goldData.find((item: { type: string }) => 
          item.type?.toLowerCase().includes('antam') || 
          item.type?.toLowerCase().includes('emas')
        );

        if (antamPrice) {
          cachedPrice = {
            sell_price: parseFloat(antamPrice.sell?.replace(/[^0-9]/g, '') || '0'),
            buy_price: parseFloat(antamPrice.buy?.replace(/[^0-9]/g, '') || '0'),
            source: 'harga-emas.org',
            updated_at: new Date().toISOString(),
          };
          cacheTime = Date.now();
          return cachedPrice;
        }
      }
    }
  } catch (error) {
    console.error('Error fetching from primary API:', error);
  }

  try {
    // Fallback: Try alternative API
    const response = await fetch('https://api.metals.live/v1/spot/gold', {
      next: { revalidate: 300 },
    });

    if (response.ok) {
      const data = await response.json();
      // Convert USD to IDR (approximate rate)
      const usdToIdr = 15500; // You might want to fetch this dynamically too
      const pricePerOunce = data[0]?.price || 2000;
      const pricePerGram = (pricePerOunce / 31.1035) * usdToIdr;

      cachedPrice = {
        sell_price: Math.round(pricePerGram),
        buy_price: Math.round(pricePerGram * 0.95), // Approximate buy-back price
        source: 'metals.live (converted)',
        updated_at: new Date().toISOString(),
      };
      cacheTime = Date.now();
      return cachedPrice;
    }
  } catch (error) {
    console.error('Error fetching from fallback API:', error);
  }

  // Final fallback: Return a reasonable default price
  // Based on typical Indonesian gold prices (update periodically)
  return {
    sell_price: 1450000, // ~Rp 1.45 juta per gram
    buy_price: 1350000,  // ~Rp 1.35 juta per gram
    source: 'default (offline)',
    updated_at: new Date().toISOString(),
  };
}

export async function GET() {
  try {
    const priceData = await fetchGoldPrice();

    return NextResponse.json(
      successResponse(priceData, 'Gold price fetched successfully')
    );
  } catch (error) {
    console.error('Error fetching gold price:', error);
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}
