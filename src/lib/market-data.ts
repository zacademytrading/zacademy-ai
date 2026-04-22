// src/lib/market-data.ts
// Real-time market data — Saham Global (IDX + US), Crypto, Forex, Emas, Perak, Komoditas
// Provider: Twelve Data (primary) + Yahoo Finance (saham IDX & komoditas fallback)

const TWELVE_API_KEYS = [
  process.env.TWELVE_API_KEY,
  process.env.TWELVE_API_KEY2,
  process.env.TWELVE_API_KEY3,
  process.env.TWELVE_API_KEY4,
  process.env.TWELVE_API_KEY5,
].filter(Boolean) as string[];

// ─── YAHOO FINANCE TICKER MAP (for commodities not on free Twelve Data plan) ──
const YAHOO_TICKER_MAP: Record<string, string> = {
  // Precious Metals
  'XAG': 'SI=F', 'XAGUSD': 'SI=F', 'SILVER': 'SI=F', 'PERAK': 'SI=F',
  'XPT': 'PL=F', 'PLATINUM': 'PL=F',
  'XPD': 'PA=F', 'PALLADIUM': 'PA=F',
  // Energy
  'WTI': 'CL=F', 'OIL': 'CL=F', 'MINYAK': 'CL=F', 'CRUDE': 'CL=F', 'USOIL': 'CL=F',
  'BRENT': 'BZ=F', 'BRTOIL': 'BZ=F',
  'NATGAS': 'NG=F', 'GAS': 'NG=F',
  // Agricultural
  'WHEAT': 'ZW=F', 'CORN': 'ZC=F', 'SOYBEAN': 'ZS=F',
  // Base Metals
  'COPPER': 'HG=F', 'XCU': 'HG=F', 'TEMBAGA': 'HG=F',
  // Indices Global
  'SPY': 'SPY', 'QQQ': 'QQQ', 'DIA': 'DIA', 'IWM': 'IWM',
  'SP500': 'SPY', 'NASDAQ': 'QQQ', 'DOW': 'DIA',
  // Indeks Indonesia
  'IHSG': '^JKSE', 'JKSE': '^JKSE', 'LQ45': '^JKLQ45', 'IDX30': '^JKIDX30',
  // ── Saham IDX (BEI) — suffix .JK ──
  // Perbankan
  'BBCA': 'BBCA.JK', 'BBRI': 'BBRI.JK', 'BMRI': 'BMRI.JK', 'BBNI': 'BBNI.JK',
  'BNGA': 'BNGA.JK', 'BDMN': 'BDMN.JK', 'BTPS': 'BTPS.JK', 'BJTM': 'BJTM.JK',
  'BSDE': 'BSDE.JK', 'BJBR': 'BJBR.JK', 'AGRO': 'AGRO.JK', 'ARTO': 'ARTO.JK',
  // Telekomunikasi & Teknologi
  'TLKM': 'TLKM.JK', 'EXCL': 'EXCL.JK', 'ISAT': 'ISAT.JK', 'TBIG': 'TBIG.JK',
  'TOWR': 'TOWR.JK', 'GOTO': 'GOTO.JK', 'BUKA': 'BUKA.JK', 'EMTK': 'EMTK.JK',
  // Energi & Pertambangan
  'ADRO': 'ADRO.JK', 'PTBA': 'PTBA.JK', 'ITMG': 'ITMG.JK', 'HRUM': 'HRUM.JK',
  'BUMI': 'BUMI.JK', 'INDY': 'INDY.JK', 'BYAN': 'BYAN.JK', 'PTRO': 'PTRO.JK',
  'MEDC': 'MEDC.JK', 'RATU': 'RATU.JK',
  // Logam & Mineral
  'ANTM': 'ANTM.JK', 'TINS': 'TINS.JK', 'INCO': 'INCO.JK', 'DKFT': 'DKFT.JK',
  'MDKA': 'MDKA.JK', 'MAPA': 'MAPA.JK',
  // BUMN & Infrastruktur
  'WSKT': 'WSKT.JK', 'PTPP': 'PTPP.JK', 'WIKA': 'WIKA.JK', 'ADHI': 'ADHI.JK',
  'JSMR': 'JSMR.JK', 'PGAS': 'PGAS.JK', 'SMGR': 'SMGR.JK', 'SMBR': 'SMBR.JK',
  // Consumer & Retail
  'UNVR': 'UNVR.JK', 'HMSP': 'HMSP.JK', 'GGRM': 'GGRM.JK', 'WIIM': 'WIIM.JK',
  'INDF': 'INDF.JK', 'ICBP': 'ICBP.JK', 'MYOR': 'MYOR.JK', 'ULTJ': 'ULTJ.JK',
  'SIDO': 'SIDO.JK', 'KLBF': 'KLBF.JK', 'KAEF': 'KAEF.JK', 'MIKA': 'MIKA.JK',
  'ACES': 'ACES.JK', 'MAPI': 'MAPI.JK', 'LPPF': 'LPPF.JK', 'RALS': 'RALS.JK',
  // Properti
  'BSDE2': 'BSDE.JK', 'LPKR': 'LPKR.JK', 'PWON': 'PWON.JK', 'CTRA': 'CTRA.JK',
  'SMRA': 'SMRA.JK', 'DILD': 'DILD.JK', 'ASRI': 'ASRI.JK',
  // Otomotif & Manufaktur
  'ASII': 'ASII.JK', 'AUTO': 'AUTO.JK', 'INTP': 'INTP.JK', 'TPIA': 'TPIA.JK',
  'BRPT': 'BRPT.JK', 'INKP': 'INKP.JK', 'TKIM': 'TKIM.JK',
  // Investasi & Holding
  'DNET': 'DNET.JK', 'BINA': 'BINA.JK', 'BHIT': 'BHIT.JK', 'MLPL': 'MLPL.JK',
};

// ─── TWELVE DATA SYMBOL MAP ────────────────────────────────────────────────────
export const SYMBOL_MAPPINGS: Record<string, string> = {
  // ── Commodities (Twelve Data - Gold only on free plan) ──
  XAU: 'XAU/USD', XAUUSD: 'XAU/USD', GOLD: 'XAU/USD', EMAS: 'XAU/USD',
  XAG: 'XAG/USD', XAGUSD: 'XAG/USD', SILVER: 'XAG/USD', PERAK: 'XAG/USD',
  WTI: 'WTI/USD', OIL: 'WTI/USD', MINYAK: 'WTI/USD', CRUDE: 'WTI/USD',
  BRENT: 'BRENT/USD', NATGAS: 'NATGAS/USD', GAS: 'NATGAS/USD',
  XCU: 'XCU/USD', COPPER: 'XCU/USD', TEMBAGA: 'XCU/USD',
  WHEAT: 'WHEAT/USD', CORN: 'CORN/USD', SOYBEAN: 'SOYBEAN/USD',
  XPT: 'XPT/USD', PLATINUM: 'XPT/USD', XPD: 'XPD/USD', PALLADIUM: 'XPD/USD',
  // ── Major Forex ──
  'EUR/USD': 'EUR/USD', EURUSD: 'EUR/USD',
  'GBP/USD': 'GBP/USD', GBPUSD: 'GBP/USD',
  'USD/JPY': 'USD/JPY', USDJPY: 'USD/JPY',
  'USD/CHF': 'USD/CHF', USDCHF: 'USD/CHF',
  'AUD/USD': 'AUD/USD', AUDUSD: 'AUD/USD',
  'USD/CAD': 'USD/CAD', USDCAD: 'USD/CAD',
  'NZD/USD': 'NZD/USD', NZDUSD: 'NZD/USD',
  // ── Minor / Cross Forex ──
  'EUR/GBP': 'EUR/GBP', EURGBP: 'EUR/GBP',
  'EUR/JPY': 'EUR/JPY', EURJPY: 'EUR/JPY',
  'GBP/JPY': 'GBP/JPY', GBPJPY: 'GBP/JPY',
  'AUD/JPY': 'AUD/JPY', AUDJPY: 'AUD/JPY',
  'EUR/AUD': 'EUR/AUD', EURAUD: 'EUR/AUD',
  'GBP/AUD': 'GBP/AUD', GBPAUD: 'GBP/AUD',
  'USD/SGD': 'USD/SGD', USDSGD: 'USD/SGD',
  'USD/IDR': 'USD/IDR', USDIDR: 'USD/IDR', RUPIAH: 'USD/IDR',
  'USD/MYR': 'USD/MYR', USDMYR: 'USD/MYR',
  'USD/THB': 'USD/THB', USDTHB: 'USD/THB',
  // ── Crypto ──
  BTC: 'BTC/USD', BTCUSD: 'BTC/USD', BITCOIN: 'BTC/USD',
  ETH: 'ETH/USD', ETHUSD: 'ETH/USD', ETHEREUM: 'ETH/USD',
  BNB: 'BNB/USD', SOL: 'SOL/USD', SOLANA: 'SOL/USD',
  XRP: 'XRP/USD', RIPPLE: 'XRP/USD',
  ADA: 'ADA/USD', CARDANO: 'ADA/USD',
  DOGE: 'DOGE/USD', DOGECOIN: 'DOGE/USD',
  DOT: 'DOT/USD', LINK: 'LINK/USD',
  LTC: 'LTC/USD', LITECOIN: 'LTC/USD',
  BCH: 'BCH/USD', XLM: 'XLM/USD', STELLAR: 'XLM/USD',
  AVAX: 'AVAX/USD', MATIC: 'MATIC/USD', ATOM: 'ATOM/USD',
  UNI: 'UNI/USD', AAVE: 'AAVE/USD',
  SHIB: 'SHIB/USD', PEPE: 'PEPE/USD',
  SUI: 'SUI/USD', APT: 'APT/USD', ARB: 'ARB/USD', OP: 'OP/USD',
  // ── US Stocks ──
  AAPL: 'AAPL', TSLA: 'TSLA', MSFT: 'MSFT', GOOGL: 'GOOGL',
  AMZN: 'AMZN', NVDA: 'NVDA', META: 'META', NFLX: 'NFLX',
  BABA: 'BABA', AMD: 'AMD', INTC: 'INTC', ORCL: 'ORCL',
  JPM: 'JPM', BAC: 'BAC', GS: 'GS', V: 'V', MA: 'MA',
  COIN: 'COIN', MSTR: 'MSTR', SPY: 'SPY', QQQ: 'QQQ',
};

// ─── ASSET TYPE ────────────────────────────────────────────────────────────────
export type AssetType = 'crypto' | 'forex' | 'stock' | 'stock_idx' | 'commodity' | 'index' | 'unknown';

// Set saham IDX — ticker tanpa .JK
const IDX_STOCKS = new Set([
  'BBCA','BBRI','BMRI','BBNI','BNGA','BDMN','BTPS','BJTM','BJBR','AGRO','ARTO',
  'TLKM','EXCL','ISAT','TBIG','TOWR','GOTO','BUKA','EMTK',
  'ADRO','PTBA','ITMG','HRUM','BUMI','INDY','BYAN','PTRO','MEDC',
  'ANTM','TINS','INCO','DKFT','MDKA',
  'WSKT','PTPP','WIKA','ADHI','JSMR','PGAS','SMGR','SMBR',
  'UNVR','HMSP','GGRM','WIIM','INDF','ICBP','MYOR','ULTJ','SIDO',
  'KLBF','KAEF','MIKA','ACES','MAPI','LPPF','RALS',
  'LPKR','PWON','CTRA','SMRA','DILD','ASRI','BSDE',
  'ASII','AUTO','INTP','TPIA','BRPT','INKP','TKIM',
  'DNET','BHIT','MLPL',
]);

const IDX_INDICES = new Set(['IHSG','JKSE','LQ45','IDX30']);

const COMMODITY_SET = new Set([
  'XAU','XAUUSD','GOLD','EMAS','XAG','XAGUSD','SILVER','PERAK',
  'WTI','OIL','MINYAK','CRUDE','BRENT','NATGAS','GAS','USOIL',
  'XCU','COPPER','TEMBAGA','WHEAT','CORN','SOYBEAN',
  'XPT','PLATINUM','XPD','PALLADIUM',
]);
const CRYPTO_SET = new Set([
  'BTC','BTCUSD','BITCOIN','ETH','ETHUSD','ETHEREUM','BNB','SOL','SOLANA',
  'XRP','RIPPLE','ADA','CARDANO','DOGE','DOGECOIN','DOT','LINK',
  'LTC','LITECOIN','BCH','XLM','STELLAR','AVAX','MATIC','ATOM',
  'UNI','AAVE','SHIB','PEPE','SUI','APT','ARB','OP',
]);
const FOREX_SET = new Set([
  'EUR/USD','EURUSD','GBP/USD','GBPUSD','USD/JPY','USDJPY',
  'USD/CHF','USDCHF','AUD/USD','AUDUSD','USD/CAD','USDCAD','NZD/USD','NZDUSD',
  'EUR/GBP','EURGBP','EUR/JPY','EURJPY','GBP/JPY','GBPJPY',
  'AUD/JPY','AUDJPY','EUR/AUD','EURAUD','GBP/AUD','GBPAUD',
  'USD/SGD','USDSGD','USD/IDR','USDIDR','RUPIAH','USD/MYR','USDMYR','USD/THB','USDTHB',
]);

export function detectAssetType(symbol: string): AssetType {
  const u = symbol.toUpperCase().replace('.JK', '');
  if (IDX_INDICES.has(u)) return 'index';
  if (IDX_STOCKS.has(u)) return 'stock_idx';
  if (COMMODITY_SET.has(u)) return 'commodity';
  if (CRYPTO_SET.has(u)) return 'crypto';
  if (FOREX_SET.has(u) || u.includes('/') || u.includes('-')) return 'forex';
  // Jika input berformat XXXX.JK (manual input dengan suffix)
  if (symbol.toUpperCase().endsWith('.JK')) return 'stock_idx';
  if (/^[A-Z]{1,5}$/.test(u)) return 'stock';
  return 'unknown';
}

// ─── YAHOO FINANCE — komoditas, saham IDX, & indeks ─────────────────────────
async function getYahooFinanceData(symbol: string, forceTicker?: string): Promise<any> {
  const upperSym = symbol.toUpperCase();
  // Resolusi ticker: cek map dulu, lalu cek apakah format .JK langsung
  let yahooTicker = forceTicker || YAHOO_TICKER_MAP[upperSym];
  if (!yahooTicker) {
    // Jika ticker berformat XXXX.JK langsung dari user
    if (upperSym.endsWith('.JK')) yahooTicker = upperSym;
    else return null;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooTicker)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
      // @ts-ignore
      cache: 'no-store',
    });

    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const price = meta.regularMarketPrice;
    const prevClose = meta.previousClose || meta.chartPreviousClose;
    const change = prevClose ? price - prevClose : 0;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;
    const currency: string = meta.currency || 'USD';

    return {
      symbol: upperSym,
      price,
      change,
      change_percent: changePct,
      open: meta.regularMarketOpen || price,
      high: meta.regularMarketDayHigh || price,
      low: meta.regularMarketDayLow || price,
      previous_close: prevClose,
      volume: meta.regularMarketVolume || 0,
      currency,                        // 'IDR' untuk saham IDX, 'USD' untuk lainnya
      market_cap: meta.marketCap || 0,
      exchange: meta.exchangeName || meta.fullExchangeName || '',
      source: 'Yahoo Finance',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ─── TWELVE DATA FETCH (with auto key fallback) ────────────────────────────────
async function tryTwelveDataFetch(
  symbol: string,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<any> {
  const mappedSymbol = SYMBOL_MAPPINGS[symbol.toUpperCase()] || symbol;

  for (let i = 0; i < TWELVE_API_KEYS.length; i++) {
    const apiKey = TWELVE_API_KEYS[i];
    try {
      const queryParams = new URLSearchParams({ symbol: mappedSymbol, apikey: apiKey, ...params });
      const url = `https://api.twelvedata.com/${endpoint}?${queryParams}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        // @ts-ignore
        cache: 'no-store',
      });

      if (!res.ok) {
        if (res.status === 429 || res.status === 401) continue;
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      // Rate limit or quota
      if (data.code === 429 || data.message?.includes('limit') || data.message?.includes('quota')) {
        continue;
      }
      // Symbol needs higher plan
      if (data.status === 'error' && data.message?.includes('Grow or Venture')) {
        throw new Error('PLAN_UPGRADE_REQUIRED');
      }
      if (data.status === 'error' || data.code) {
        throw new Error(data.message || 'API error');
      }

      return { data, apiKeyIndex: i };
    } catch (err: any) {
      if (
        err.message === 'PLAN_UPGRADE_REQUIRED' ||
        err.message?.includes('429') ||
        err.message?.includes('limit') ||
        err.message?.includes('quota')
      ) {
        if (err.message === 'PLAN_UPGRADE_REQUIRED') throw err;
        continue;
      }
      throw err;
    }
  }
  throw new Error('Semua API key Twelve Data telah mencapai limit.');
}

// ─── GET FULL QUOTE ────────────────────────────────────────────────────────────
export async function getTwelveDataQuote(symbol: string): Promise<any> {
  try {
    const { data } = await tryTwelveDataFetch(symbol, 'quote');
    return {
      symbol: symbol.toUpperCase(),
      price: parseFloat(data.close || data.price),
      change: parseFloat(data.change || 0),
      change_percent: parseFloat(data.percent_change || 0),
      open: parseFloat(data.open),
      high: parseFloat(data.high),
      low: parseFloat(data.low),
      volume: parseInt(data.volume || 0),
      previous_close: parseFloat(data.previous_close),
      source: 'Twelve Data',
      timestamp: data.datetime || new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function getTwelveDataPrice(symbol: string): Promise<any> {
  try {
    const { data } = await tryTwelveDataFetch(symbol, 'price');
    return {
      symbol: symbol.toUpperCase(),
      price: parseFloat(data.price),
      source: 'Twelve Data',
      timestamp: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// ─── MAIN getMarketData ────────────────────────────────────────────────────────
export async function getMarketData(symbol: string): Promise<any> {
  const assetType = detectAssetType(symbol);
  console.log(`🔍 [MarketData] ${assetType} → ${symbol}`);

  // Saham IDX & indeks Indonesia → langsung ke Yahoo Finance
  if (assetType === 'stock_idx' || assetType === 'index') {
    const data = await getYahooFinanceData(symbol);
    if (data?.price) return { ...data, type: assetType };
    // Coba tambah suffix .JK jika belum ada
    if (!symbol.toUpperCase().endsWith('.JK')) {
      const dataJK = await getYahooFinanceData(symbol, symbol.toUpperCase() + '.JK');
      if (dataJK?.price) return { ...dataJK, type: assetType };
    }
    return null;
  }

  // 1. Try Twelve Data first (XAU, crypto, forex, US stocks)
  let data = await getTwelveDataQuote(symbol);
  if (data?.price) {
    return { ...data, type: assetType };
  }

  // 2. Fallback to Yahoo Finance (XAG, WTI, BRENT, NATGAS, metals, ETF indices)
  data = await getYahooFinanceData(symbol);
  if (data?.price) {
    return { ...data, type: assetType };
  }

  // 3. Last resort: simple price endpoint on Twelve Data
  data = await getTwelveDataPrice(symbol);
  if (data?.price) {
    return { ...data, type: assetType, change_percent: 0 };
  }

  return null;
}

// ─── MULTI-SYMBOL FETCH (parallel, max 4) ─────────────────────────────────────
export async function getMultiMarketData(symbols: string[]): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  await Promise.allSettled(
    symbols.slice(0, 4).map(async (sym) => {
      const data = await getMarketData(sym);
      if (data) results[sym] = data;
    })
  );
  return results;
}

// ─── LEGACY COMPAT ────────────────────────────────────────────────────────────
export async function getCryptoData(coinId: string) { return getMarketData(coinId.toUpperCase()); }
export async function getForexData(symbol: string) { return getMarketData(symbol.toUpperCase()); }
export async function getStockData(symbol: string) { return getMarketData(symbol.toUpperCase()); }
