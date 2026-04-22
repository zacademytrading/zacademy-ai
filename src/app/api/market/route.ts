// src/app/api/market/route.ts
// API untuk fetch real-time market data dari Twelve Data (dengan auto-fallback)

import { NextRequest, NextResponse } from 'next/server';
import { getMarketData, detectAssetType } from '@/lib/market-data';

export async function POST(req: NextRequest) {
  try {
    const { symbol } = await req.json();
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }
    
    const assetType = detectAssetType(symbol);
    const marketData = await getMarketData(symbol.toUpperCase());
    
    if (marketData && marketData.price) {
      return NextResponse.json({
        ...marketData,
        type: assetType,
        success: true,
      });
    }
    
    return NextResponse.json({ 
      error: 'Data not available', 
      symbol: symbol.toUpperCase(),
      type: assetType,
      success: false 
    }, { status: 404 });
    
  } catch (error: any) {
    console.error('Market API Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}

// Also support GET for simpler requests
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol');
    
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter required' }, { status: 400 });
    }
    
    const assetType = detectAssetType(symbol);
    const marketData = await getMarketData(symbol.toUpperCase());
    
    if (marketData && marketData.price) {
      return NextResponse.json({
        ...marketData,
        type: assetType,
        success: true,
      });
    }
    
    return NextResponse.json({ 
      error: 'Data not available', 
      symbol: symbol.toUpperCase(),
      type: assetType,
      success: false 
    }, { status: 404 });
    
  } catch (error: any) {
    console.error('Market API Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        success: false 
      },
      { status: 500 }
    );
  }
}
