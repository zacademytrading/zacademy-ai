// src/app/api/chat/route.ts
// Backend AI Chat — Groq (primary) | ZAcademy V1

import { NextRequest, NextResponse } from 'next/server';
import { ZACADEMY_MODELS, type ModelKey } from '@/lib/models';
import { getMarketData, detectAssetType } from '@/lib/market-data';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const ADMIN_EMAILS = ['mwildanhikamd@gmail.com', 'zenixproffiicial@gmail.com'];

const SYSTEM_PROMPT = `Anda adalah ZENIX, asisten AI Trading profesional dari ZAcademy.

KEAHLIAN:
- Saham Global: US Stocks (NYSE/NASDAQ), Asia, Indonesia (IDX/BEI)
- Crypto: Bitcoin, Ethereum, Altcoin, DeFi, Meme Coin
- Forex: Major, Minor, Exotic Pairs termasuk USD/IDR
- Komoditas: Emas (XAU), Perak (XAG), Minyak (WTI/Brent), Gas Alam, Tembaga, dll
- Indeks: IHSG, S&P 500, NASDAQ, Dow Jones, LQ45

FITUR ANALISA:
- Technical analysis: support/resistance, trendline, candlestick, RSI, MACD, MA, BB, Stoch
- Signal trading: Entry, Stop Loss, Take Profit, Risk-Reward Ratio, Confidence
- Analisa fundamental & sentimen pasar
- Risk management & money management
- Target winrate ZAcademy: 74%+

[KALKULATOR RISIKO OTOMATIS]
Jika pengguna memberikan data modal, entry, stop loss, dan persentase risiko:
1. Hitung: Nilai Risiko ($) = Modal x Risiko%
2. Hitung: Jarak SL = |Entry - Stop Loss| dalam poin/pip
3. Hitung: Lot Size = Nilai Risiko / (Jarak SL x Nilai per pip). Catatan: nilai per pip bergantung contract size broker
4. Hitung: Target TP untuk RR 1:1, 1:2, dan 1:3
5. Tampilkan hasil dalam tabel yang rapi dan mudah dibaca

[ANALISA MULTI-TIMEFRAME]
Jika pengguna mengunggah beberapa gambar chart sekaligus (Daily, H4, M15 dsb):
1. Analisa tren makro dari timeframe terbesar (Daily) terlebih dahulu
2. Konfirmasi arah bias di timeframe menengah (H4)
3. Cari titik entry presisi di timeframe terkecil (M15/H1)
4. Berikan sinyal final lengkap dengan Entry, SL, TP, dan RR yang matang

ATURAN WAJIB:
1. Selalu sertakan disclaimer: "DISCLAIMER: Trading memiliki risiko kerugian. Ini bukan financial advice."
2. Format signal WAJIB:
   SIGNAL [SYMBOL] [TIMEFRAME]
   Entry: [harga/zona]
   Stop Loss: [harga]
   Take Profit 1: [harga]
   Take Profit 2: [harga] (opsional)
   Risk-Reward: [rasio]
   Confidence: [0-100%]
   Alasan: [penjelasan singkat]
3. Jawaban SELALU dalam Bahasa Indonesia kecuali istilah teknikal
4. Gunakan data realtime yang diberikan sebagai acuan harga UTAMA
5. Jika data realtime tersedia, WAJIB sebutkan harga terkini di awal analisa`;

// Groq model mapping
const GROQ_MODELS: Record<ModelKey, string> = {
  'zenix-think': 'llama-3.3-70b-versatile',
  'zenix-fast': 'llama-3.1-8b-instant',
};

async function callGroq(messages: any[], model: string, temperature: number): Promise<string> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 4096,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Groq HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// Auto Email Alert Logger (logs to console, replace with real SMTP in production)
async function sendErrorAlert(error: Error, context: string) {
  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const logMsg = `
========================================
[🚨 ZENIX AUTO-ALERT — ERROR DETECTED]
Timestamp : ${timestamp} WIB
Context   : ${context}
Error     : ${error.message}
Stack     : ${error.stack?.split('\n')[1]?.trim() || 'N/A'}
To        : ${ADMIN_EMAILS.join(', ')}
Subject   : 🚨 ZENIX AI System Error Alert
========================================`;
  console.error(logMsg);
  // TODO: Integrate with Resend / Nodemailer / SendGrid when SMTP is configured
  // Example with Resend: await resend.emails.send({ from: 'alert@zacademy.ai', to: ADMIN_EMAILS, subject: '🚨 ZENIX Error', text: logMsg });
}

// Simple DuckDuckGo scraper for latest news
async function fetchDuckDuckGoNews(query: string): Promise<string> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    if (!res.ok) return '';
    const html = await res.text();
    const snippets = html.match(/<a class="result__snippet[^>]*>(.*?)<\/a>/gi) || [];
    const results = snippets.slice(0, 3).map(s => s.replace(/<[^>]+>/g, '').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').trim()).join('\n- ');
    return results ? `\n\n[BERITA TERKINI DARI WEB UNTUK "${query}"]:\n- ${results}` : '';
  } catch (e) {
    return '';
  }
}

// Detect symbols in user query
function extractSymbol(text: string): string | null {
  const symbolRegex = /\b(XAUUSD|XAGUSD|GOLD|EMAS|SILVER|PERAK|MINYAK|CRUDE|WTI|BRENT|NATGAS|GAS|COPPER|TEMBAGA|BITCOIN|ETHEREUM|SOLANA|RIPPLE|CARDANO|DOGECOIN|LITECOIN|STELLAR|BTC\/USD|ETH\/USD|EUR\/USD|GBP\/USD|USD\/JPY|USD\/CHF|AUD\/USD|USD\/CAD|NZD\/USD|EUR\/GBP|EUR\/JPY|GBP\/JPY|AUD\/JPY|USD\/IDR|USD\/SGD|USD\/MYR|BTCUSD|ETHUSD|EURUSD|GBPUSD|USDJPY|USDCHF|AUDUSD|USDCAD|NZDUSD|EURGBP|EURJPY|GBPJPY|AUDJPY|USDIDR|USDSGD|USDMYR|BTC|ETH|BNB|SOL|XRP|ADA|DOGE|DOT|LINK|LTC|BCH|XLM|AVAX|MATIC|ATOM|UNI|AAVE|SHIB|PEPE|SUI|APT|ARB|OP|XAU|XAG|XPT|XPD|AAPL|TSLA|MSFT|GOOGL|AMZN|NVDA|META|NFLX|BABA|AMD|INTC|ORCL|JPM|BAC|GS|COIN|MSTR|SPY|QQQ|IHSG|LQ45|IDX30|BBCA|BBRI|BMRI|BBNI|BNGA|TLKM|EXCL|ISAT|GOTO|ADRO|PTBA|ITMG|HRUM|BUMI|ANTM|TINS|INCO|MDKA|WSKT|PTPP|WIKA|ADHI|JSMR|PGAS|SMGR|UNVR|HMSP|GGRM|INDF|ICBP|MYOR|KLBF|KAEF|ACES|MAPI|LPKR|PWON|CTRA|SMRA|ASII|AUTO|INTP|TPIA)\b/gi;
  const kwMap: Record<string, string> = {
    BITCOIN: 'BTC', ETHEREUM: 'ETH', SOLANA: 'SOL', RIPPLE: 'XRP',
    CARDANO: 'ADA', DOGECOIN: 'DOGE', LITECOIN: 'LTC', STELLAR: 'XLM',
    GOLD: 'GOLD', EMAS: 'GOLD', SILVER: 'SILVER', PERAK: 'SILVER',
    MINYAK: 'WTI', CRUDE: 'WTI', GAS: 'NATGAS', TEMBAGA: 'COPPER',
    BTCUSD: 'BTC', ETHUSD: 'ETH', EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD',
    USDJPY: 'USD/JPY', USDCHF: 'USD/CHF', AUDUSD: 'AUD/USD',
    USDCAD: 'USD/CAD', NZDUSD: 'NZD/USD', XAUUSD: 'XAUUSD', XAGUSD: 'XAGUSD',
    IHSG: 'IHSG', LQ45: 'LQ45',
  };
  const matches = text.match(symbolRegex);
  if (!matches) return null;
  const raw = matches[0].toUpperCase();
  return kwMap[raw] || raw;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model, settings } = await req.json();
    const modelKey = (model as ModelKey) || 'zenix-think';
    const modelConfig = ZACADEMY_MODELS[modelKey] || ZACADEMY_MODELS['zenix-think'];
    const groqModel = GROQ_MODELS[modelKey] || 'llama-3.3-70b-versatile';

    const lang = settings?.language || 'Bahasa Indonesia';
    const personalIntel = settings?.personalIntelligence || '';

    // Dynamic instructions based on User Settings
    let dynamicPrompt = SYSTEM_PROMPT.replace(
      'Jawaban SELALU dalam Bahasa Indonesia kecuali istilah teknikal',
      `Jawaban SELALU dalam bahasa: ${lang} kecuali istilah teknikal`
    );
    if (personalIntel) {
      dynamicPrompt += `\n\nINSTRUKSI PERSONAL DARI PENGGUNA:\n${personalIntel}`;
    }
    if (modelKey === 'zenix-fast') {
      dynamicPrompt += `\n\nMODE AKTIF: FAST MODE. Jawablah sesingkat dan secepat mungkin tanpa mengurangi poin utama.`;
    } else {
      dynamicPrompt += `\n\nMODE AKTIF: THINK MODE. Berfikirlah dengan sangat mendalam (2x lipat), pastikan akurasi sangat tinggi, profesional, dan cek ulang setiap prediksi harga.`;
    }

    // Get last user message
    const lastMsg = messages[messages.length - 1];
    let userQuery = '';
    if (typeof lastMsg?.content === 'string') {
      userQuery = lastMsg.content;
    } else if (Array.isArray(lastMsg?.content)) {
      const textItem = lastMsg.content.find((i: any) => i.type === 'text');
      userQuery = textItem ? textItem.text : '';
    }

    // Count how many images in the last message (multi-timeframe support)
    const imageItems = Array.isArray(lastMsg?.content)
      ? lastMsg.content.filter((i: any) => i.type === 'image_url')
      : [];
    const imageCount = imageItems.length;
    const hasImage = imageCount > 0;

    // For multi-timeframe: inject extra instruction if multiple images detected
    if (imageCount > 1) {
      dynamicPrompt += `\n\n[MULTI-TIMEFRAME MODE AKTIF]
Pengguna mengunggah ${imageCount} chart sekaligus. Lakukan analisa Top-Down:
- Gambar 1 = Timeframe terbesar (Daily / Weekly) → analisa tren makro
- Gambar 2 = Timeframe menengah (H4 / H1) → konfirmasi bias
${imageCount >= 3 ? '- Gambar 3 = Timeframe kecil (M15 / M5) → cari titik entry presisi' : ''}
Berikan sinyal trading final yang komprehensif berdasarkan ketiga timeframe.`;
    }

    let finalModel = hasImage ? 'meta-llama/llama-4-scout-17b-16e-instruct' : groqModel;

    // Web Browsing / News Intent Detection
    let browsingContext = '';
    const lowerQ = userQuery.toLowerCase();
    const isNewsIntent = lowerQ.includes('berita') || lowerQ.includes('kenapa') || lowerQ.includes('mengapa') || lowerQ.includes('news') || lowerQ.includes('kabar') || lowerQ.includes('sentimen');
    if (isNewsIntent) {
      const searchQuery = `berita ekonomi terbaru ${extractSymbol(userQuery) || ''} ${lowerQ.includes('turun') ? 'turun' : ''} ${lowerQ.includes('naik') ? 'naik' : ''}`.trim();
      browsingContext = await fetchDuckDuckGoNews(searchQuery);
    }

    // Fetch market data if symbol detected
    let marketContext = '';
    const sym = extractSymbol(userQuery);
    if (sym) {
      try {
        const md = await getMarketData(sym);
        if (md?.price) {
          const isIDR = md.currency === 'IDR';
          const fmt = (n: number) => isIDR
            ? 'Rp ' + Math.round(n).toLocaleString('id-ID')
            : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 });
          const sign = (md.change_percent ?? 0) >= 0 ? '+' : '';
          const typeLabel: Record<string, string> = {
            commodity: 'Komoditas', crypto: 'Kripto', forex: 'Forex',
            stock: 'Saham US', stock_idx: 'Saham IDX (BEI)', index: 'Indeks',
          };
          marketContext = `\n\n[DATA PASAR REALTIME - ${new Date().toLocaleString('id-ID')}]
Aset: ${sym} (${typeLabel[md.type] || md.type})
Harga: ${fmt(md.price)}
Perubahan: ${sign}${Number(md.change_percent ?? 0).toFixed(2)}%
${md.open ? `Open: ${fmt(md.open)}\n` : ''}${md.high ? `High: ${fmt(md.high)}\n` : ''}${md.low ? `Low: ${fmt(md.low)}\n` : ''}${md.previous_close ? `Prev Close: ${fmt(md.previous_close)}\n` : ''}Mata Uang: ${md.currency || 'USD'}
Sumber: ${md.source} (Live)
[INSTRUKSI: Gunakan harga di atas sebagai acuan UTAMA. Sebutkan harga terkini di awal analisa.]`;
        } else {
          marketContext = `\n\n[INFO: Data realtime ${sym} tidak tersedia. Jangan sebut harga spesifik.]`;
        }
      } catch {
        // silent fail for market data
      }
    }

    // Build API messages
    const apiMessages = [
      { role: 'system', content: dynamicPrompt + marketContext + browsingContext },
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // Call Groq
    const content = await callGroq(apiMessages, finalModel, modelConfig.temperature);

    return NextResponse.json({ content, model: finalModel });

  } catch (error: any) {
    // Auto-send error alert to admin (logs to console; hook into SMTP for production)
    await sendErrorAlert(error, 'POST /api/chat');

    // Return graceful, user-friendly error message
    return NextResponse.json(
      {
        error: 'ZENIX sedang melakukan kalibrasi sistem dan sinkronisasi data pasar secara otomatis. Sabar ya, sebentar lagi kembali normal! Silakan coba lagi dalam 5 menit. 🙏'
      },
      { status: 500 }
    );
  }
}
