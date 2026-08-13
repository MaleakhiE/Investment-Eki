/**
 * Mutual Fund NAV API Route
 * 
 * GET /api/mutual-fund/nav - Get current NAV for mutual funds
 * GET /api/mutual-fund/nav?fund=name - Search specific fund
 * 
 * Fetches real-time NAV data from public sources
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import {
  successResponse,
  unauthorizedResponse,
  serverErrorResponse,
} from '@/lib/api-response';

interface NavData {
  fund_name: string;
  nav: number;
  date: string;
  change_percent: number;
  source: string;
  type?: string;
  manager?: string;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(unauthorizedResponse(), { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fundName = searchParams.get('fund');

    if (!fundName) {
      return NextResponse.json(successResponse(null, 'Please provide fund name'));
    }

    // Try multiple sources in order
    let navData = await fetchFromPasardana(fundName);
    
    if (!navData || navData.nav === 0) {
      navData = await fetchFromInfovesta(fundName);
    }

    if (navData && navData.nav > 0) {
      return NextResponse.json(successResponse(navData, 'NAV retrieved'));
    }

    return NextResponse.json(successResponse({
      fund_name: fundName,
      nav: 0,
      date: new Date().toISOString().split('T')[0],
      change_percent: 0,
      source: 'not_found',
      message: 'NAV tidak ditemukan. Silakan input manual.',
    }, 'Fund not found'));
  } catch {
    console.error('mutual_fund_nav_fetch_failed');
    return NextResponse.json(serverErrorResponse(), { status: 500 });
  }
}


/**
 * Fetch NAV from Pasardana.id (scraping public page)
 */
async function fetchFromPasardana(fundName: string): Promise<NavData | null> {
  try {
    // Search mutual fund on pasardana
    const searchUrl = `https://pasardana.id/mutual-fund?search=${encodeURIComponent(fundName)}`;
    
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    
    // Parse NAV from HTML response
    // Look for patterns like "NAB/Unit: Rp 1,234.56" or similar
    const navMatch = html.match(/NAB[\/\s]*Unit[:\s]*Rp[.\s]*([\d.,]+)/i) ||
                     html.match(/nav[:\s]*([\d.,]+)/i) ||
                     html.match(/"nav"[:\s]*([\d.,]+)/i);
    
    if (navMatch) {
      const navValue = parseFloat(navMatch[1].replace(/[.,]/g, (m) => m === ',' ? '' : '.'));
      if (navValue > 0) {
        return {
          fund_name: fundName,
          nav: navValue,
          date: new Date().toISOString().split('T')[0],
          change_percent: 0,
          source: 'pasardana',
        };
      }
    }
  } catch {
    console.error('mutual_fund_nav_pasardana_failed');
  }
  return null;
}

/**
 * Fetch NAV from Infovesta (alternative source)
 */
async function fetchFromInfovesta(fundName: string): Promise<NavData | null> {
  try {
    const searchUrl = `https://www.infovesta.com/index/fund/search?q=${encodeURIComponent(fundName)}`;
    
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const html = await res.text();
    
    // Parse NAV from Infovesta HTML
    const navMatch = html.match(/NAV[:\s]*Rp[.\s]*([\d.,]+)/i) ||
                     html.match(/"navPerUnit"[:\s]*([\d.,]+)/i) ||
                     html.match(/class="nav"[^>]*>([\d.,]+)/i);
    
    if (navMatch) {
      const navValue = parseFloat(navMatch[1].replace(/[.,]/g, (m) => m === ',' ? '' : '.'));
      if (navValue > 0) {
        return {
          fund_name: fundName,
          nav: navValue,
          date: new Date().toISOString().split('T')[0],
          change_percent: 0,
          source: 'infovesta',
        };
      }
    }
  } catch {
    console.error('mutual_fund_nav_infovesta_failed');
  }
  return null;
}
