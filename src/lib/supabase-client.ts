// src/lib/supabase-client.ts
// Lightweight Supabase REST API client (No npm install required)

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xktkruqvaylhsgwvwjjw.supabase.co').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrdGtydXF2YXlsaHNnd3Z3amp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDkzNTEsImV4cCI6MjA5MjQyNTM1MX0.j61VE-Nlhd-AUB5Vtnegi9a2_0jofS9CQkv9jg9tIDY';

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

// Database Methods
export const supabaseDb = {
  async getChats(userId: string) {
    if (!SUPABASE_URL) return [];
    const res = await fetch(`${SUPABASE_URL}/rest/v1/chats?user_id=eq.${userId}&order=created_at.desc`, { headers });
    if (!res.ok) return [];
    return res.json();
  },
  
  async upsertChat(chat: any) {
    if (!SUPABASE_URL) return;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/chats?id=eq.${chat.id}`, {
      method: 'GET',
      headers
    });
    const exists = await res.json();
    
    if (exists && exists.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/chats?id=eq.${chat.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(chat)
      });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/chats`, {
        method: 'POST',
        headers,
        body: JSON.stringify(chat)
      });
    }
  },

  async deleteChat(chatId: string) {
    if (!SUPABASE_URL) return;
    await fetch(`${SUPABASE_URL}/rest/v1/chats?id=eq.${chatId}`, {
      method: 'DELETE',
      headers
    });
  }
};

// Auth URL Generator
export const getGoogleAuthUrl = (redirectUrl: string) => {
  return `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}`;
};

// Get user from access token
export const getUser = async (accessToken: string) => {
  if (!SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!res.ok) return null;
  return res.json();
};
