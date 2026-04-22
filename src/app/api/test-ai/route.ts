// src/app/api/test-ai/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const results: Record<string, any> = {};

  // Test Groq
  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: 'Say: GROQ_OK' }],
        max_tokens: 10,
      }),
    });
    const d = await r.json();
    results.groq = { status: r.status, content: d.choices?.[0]?.message?.content, error: d.error?.message };
  } catch (e: any) {
    results.groq = { error: e.message };
  }

  // Test OpenRouter
  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || 'no-key'}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:3000',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat:free',
        messages: [{ role: 'user', content: 'Say: OPENROUTER_OK' }],
        max_tokens: 10,
      }),
    });
    const d = await r.json();
    results.openrouter = { status: r.status, content: d.choices?.[0]?.message?.content, error: d.error?.message };
  } catch (e: any) {
    results.openrouter = { error: e.message };
  }

  return NextResponse.json(results);
}
