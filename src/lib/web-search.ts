// src/lib/web-search.ts
// Web search menggunakan DuckDuckGo - NO API KEY NEEDED! 🦆

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
}

export async function duckDuckGoSearch(query: string, maxResults = 3): Promise<SearchResult[]> {
  try {
    // DuckDuckGo HTML search (legal, no API key)
    const response = await axios.get('https://html.duckduckgo.com/html', {
      params: { 
        q: query, 
        kl: 'id-id' // Hasil dalam Bahasa Indonesia
      },
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    const results: SearchResult[] = [];
    
    // Parse hasil search
    $('.result').slice(0, maxResults).each((_, el) => {
      const title = $(el).find('.result__title').text().trim();
      const snippet = $(el).find('.result__snippet').text().trim();
      const urlAttr = $(el).find('.result__url').attr('href');
      
      if (title && snippet && urlAttr) {
        results.push({ 
          title, 
          snippet: snippet.replace(/\n/g, ' ').slice(0, 200) + '...', 
          url: urlAttr.startsWith('http') ? urlAttr : `https:${urlAttr}`
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error('[DuckDuckGo Search Error]:', error);
    return []; // Return empty jika gagal, jangan crash app
  }
}

// Helper: Ambil konten webpage untuk dibaca AI
export async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 8000
    });
    
    const $ = cheerio.load(response.data);
    // Hapus elemen yang tidak perlu
    $('script, style, nav, footer, header, iframe').remove();
    
    // Ambil teks utama
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000); // Limit 5000 karakter agar tidak overload AI
    
    return text;
  } catch {
    return '';
  }
}