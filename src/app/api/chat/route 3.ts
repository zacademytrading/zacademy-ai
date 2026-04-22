// src/app/api/chat/route.ts
// Backend API untuk chat AI ZAcademy - Using OpenRouter (FREE models)

import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { ZACADEMY_MODELS, type ModelKey } from '@/lib/models';
import { duckDuckGoSearch } from '@/lib/web-search';
import { getCryptoData, getStockData, getForexData, detectAssetType } from '@/lib/market-data';

// OpenRouter API Client (OpenAI-compatible)
const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || '',
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'http://localhost:3000', // Required by OpenRouter
    'X-Title': 'ZAcademy AI Trading', // Optional
  }
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
    const modelConfig = ZACADEMY_MODELS[model as ModelKey] || ZACADEMY_MODELS['zacademy-think-pro'];
    
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
    
    // Build messages for API
    const apiMessages = [
      { role: 'system', content: finalSystemPrompt },
      ...messages.map((m: any) => ({ role: m.role, content: m.content }))
    ];
    
    // Stream response using OpenRouter
    const stream = await client.chat.completions.create({
      model: modelConfig.openrouterModel,
      messages: apiMessages,
      temperature: modelConfig.temperature,
      max_tokens: 4096,
      stream: true,
    });
    
    // Create readable stream
    const readableStream = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            // Format: 0:"content" (compatible with ai SDK format)
            const encoded = `0:${JSON.stringify(content)}\n`;
            controller.enqueue(new TextEncoder().encode(encoded));
          }
        }
        controller.close();
      },
    });
    
    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: (error as Error).message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
