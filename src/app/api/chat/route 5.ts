// src/app/api/chat/route.ts
// Backend API untuk chat AI ZAcademy - Using Google Gemini

import { NextRequest } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { ZACADEMY_MODELS, type ModelKey } from '@/lib/models';
import { duckDuckGoSearch } from '@/lib/web-search';
import { getCryptoData, getStockData, getForexData, detectAssetType } from '@/lib/market-data';

// Google Gemini API Client
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

// System prompt khusus ZAcademy Trading
const SYSTEM_PROMPT = `Anda adalah **ZAcademy AI Trading Assistant** 🎯
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
   📊 SIGNAL [SYMBOL] [TIMEFRAME]
   🎯 Entry: [price/zone]
   🛑 Stop Loss: [price]
   💰 Take Profit: [price/RR ratio]
   📈 Risk-Reward: [ratio]
   🎲 Confidence: [0-100%]
3. Jawaban dalam Bahasa Indonesia kecuali istilah teknikal
4. SELALU prioritaskan data real-time jika tersedia

🔹 FORMAT MARKET DATA:
Sertakan data harga terkini dalam format:
💵 Harga: $X,XXX.XX (±X.XX% 24h)
📊 Volume: $XX.XB
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, model, enableSearch } = await req.json();
    
    // Get model config
    const modelConfig = ZACADEMY_MODELS[model as ModelKey] || ZACADEMY_MODELS['zacademy-lite'];
    
    // Get last user message
    const lastMessage = messages[messages.length - 1];
    const userQuery = lastMessage?.content || '';
    
    // Detect asset symbols in query untuk market data
    const symbolMatch = userQuery.match(/\b(BTC|ETH|XRP|ADA|SOL|DOGE|BNB|XAU|XAG|AAPL|TSLA|MSFT|GOOGL|AMZN|EUR\/USD|GBP\/USD|USD\/JPY)\b/gi);
    const detectedSymbol = symbolMatch ? symbolMatch[0].toUpperCase() : null;
    
    // Build enhanced context
    let enhancedPrompt = SYSTEM_PROMPT;
    
    // Add market data if symbol detected
    if (detectedSymbol) {
      const assetType = detectAssetType(detectedSymbol);
      let marketData = null;
      
      if (assetType === 'crypto') {
        const coinId = detectedSymbol.toLowerCase();
        marketData = await getCryptoData(coinId);
      } else if (assetType === 'forex') {
        marketData = await getForexData(detectedSymbol, process.env.FCS_API_KEY);
      } else if (assetType === 'stock') {
        marketData = await getStockData(detectedSymbol, process.env.ALPHA_VANTAGE_KEY);
      }
      
      if (marketData && marketData.price) {
        enhancedPrompt += `\n\n📈 DATA MARKET REALTIME (${detectedSymbol}):\n`;
        enhancedPrompt += `Harga: $${marketData.price.toLocaleString()}`;
        if (marketData.change_24h !== undefined) {
          const sign = marketData.change_24h >= 0 ? '+' : '';
          enhancedPrompt += ` (${sign}${marketData.change_24h.toFixed(2)}% 24h)`;
        }
        enhancedPrompt += `\nSumber: ${marketData.source}`;
        enhancedPrompt += `\n${marketData.disclaimer || ''}\n`;
      }
    }
    
    // Web search if enabled
    let searchContext = '';
    if (enableSearch) {
      try {
        const searchResults = await duckDuckGoSearch(`${userQuery} trading analysis ${new Date().getFullYear()}`, 3);
        if (searchResults.length > 0) {
          searchContext = '\n📰 BERITA & ANALISA TERKINI:\n';
          searchResults.forEach((result, i) => {
            searchContext += `${i + 1}. ${result.title}\n   ${result.snippet}\n`;
          });
        }
      } catch (e) {
        console.error('Search error:', e);
      }
    }
    
    // Combine system prompt with search context
    const finalSystemPrompt = enhancedPrompt + searchContext;
    
    // Build contents for Gemini API
    const contents = [
      { role: 'user', parts: [{ text: finalSystemPrompt }] },
      { role: 'model', parts: [{ text: 'Baik, saya mengerti. Saya akan membantu analisa trading dengan format yang diminta.' }] },
      ...messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }))
    ];
    
    // Generate response using Gemini
    const response = await genAI.models.generateContent({
      model: modelConfig.geminiModel,
      contents: contents,
      config: {
        temperature: modelConfig.temperature,
        maxOutputTokens: 4096,
      },
    });
    
    const content = response.text || '';
    
    // Return as stream-compatible format
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // Split content into chunks for streaming effect
        const chunks = content.match(/.{1,20}/g) || [content];
        let index = 0;
        
        const sendChunk = () => {
          if (index < chunks.length) {
            const encoded = `0:${JSON.stringify(chunks[index])}\n`;
            controller.enqueue(encoder.encode(encoded));
            index++;
            setTimeout(sendChunk, 10);
          } else {
            controller.close();
          }
        };
        
        sendChunk();
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
    
  } catch (error: any) {
    console.error('API Error:', error);
    const message = error.message || 'Internal server error';
    
    return new Response(
      JSON.stringify({ error: message, details: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
