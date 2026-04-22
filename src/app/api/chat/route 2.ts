// src/app/api/chat/route.ts
// Backend API untuk chat AI ZAcademy

import { NextRequest } from 'next/server';
import { streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { ZACADEMY_MODELS, type ModelKey } from '@/lib/models';
import { duckDuckGoSearch, fetchPageContent } from '@/lib/web-search';
import { getCryptoData, getStockData, getForexData, detectAssetType } from '@/lib/market-data';

// Inisialisasi Google Gemini
const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// System prompt khusus ZAcademy Trading
const SYSTEM_PROMPT = `
Anda adalah **ZAcademy AI Trading Assistant** 🎯
Expert analis untuk: Saham Global, Crypto, Forex, Emas (XAU), Silver, Komoditas.

🔹 CAPABILITIES:
- Technical analysis (support/resistance, indicator, pattern)
- Generate trading signals: Entry, Stop Loss, Take Profit, Risk-Reward Ratio
- Market sentiment analysis dari berita & sosial media
- Risk management education
- Winrate optimization (target ZAcademy: 74%+)

🔹 RULES WAJIB:
1. SELALU sertakan disclaimer di akhir: 
   "⚠️ DISCLAIMER: Trading memiliki risiko kerugian. Ini bukan financial advice. Lakukan riset mandiri."
2. Untuk signal trading, format WAJIB: