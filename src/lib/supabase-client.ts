// src/lib/supabase-client.ts
// Lightweight Supabase REST API client (No npm install required)

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xktkruqvaylhsgwvwjjw.supabase.co').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrdGtydXF2YXlsaHNnd3Z3amp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NDkzNTEsImV4cCI6MjA5MjQyNTM1MX0.j61VE-Nlhd-AUB5Vtnegi9a2_0jofS9CQkv9jg9tIDY';

const authHeaders = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

const dbHeaders = {
  ...authHeaders,
  Prefer: 'return=representation'
};

// ── AUTH METHODS ────────────────────────────────────────────

// Sign in with email + password via Supabase Auth
export const signInWithEmail = async (email: string, password: string) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error_description || err?.msg || 'Email atau password salah');
  }
  return res.json(); // { access_token, user, ... }
};

// Sign up with email + password
export const signUpWithEmail = async (email: string, password: string, name: string) => {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ email, password, data: { full_name: name } }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error_description || err?.msg || 'Gagal membuat akun');
  }
  return res.json();
};

// Get user info from access token
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

// Exchange PKCE code for session (fallback for code-based flow)
export const exchangeCodeForSession = async (code: string) => {
  if (!SUPABASE_URL) return null;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ auth_code: code }),
  });
  if (!res.ok) return null;
  return res.json();
};

// Auth URL Generator — force implicit flow (hash-based token)
export const getGoogleAuthUrl = (redirectUrl: string) => {
  return `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectUrl)}&response_type=token`;
};

// ── DATABASE METHODS ────────────────────────────────────────

export const supabaseDb = {
  async getChats(userId: string, accessToken?: string) {
    if (!SUPABASE_URL) return [];
    const headers = accessToken
      ? { ...dbHeaders, Authorization: `Bearer ${accessToken}` }
      : dbHeaders;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/chats?user_id=eq.${userId}&order=created_at.desc`, { headers });
    if (!res.ok) return [];
    return res.json();
  },

  async upsertChat(chat: any, accessToken?: string) {
    if (!SUPABASE_URL) return;
    const headers = accessToken
      ? { ...dbHeaders, Authorization: `Bearer ${accessToken}` }
      : dbHeaders;
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/chats?id=eq.${chat.id}`, { method: 'GET', headers });
    const exists = await checkRes.json().catch(() => []);
    if (exists && exists.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/chats?id=eq.${chat.id}`, { method: 'PATCH', headers, body: JSON.stringify(chat) });
    } else {
      await fetch(`${SUPABASE_URL}/rest/v1/chats`, { method: 'POST', headers, body: JSON.stringify(chat) });
    }
  },

  async deleteChat(chatId: string, accessToken?: string) {
    if (!SUPABASE_URL) return;
    const headers = accessToken
      ? { ...dbHeaders, Authorization: `Bearer ${accessToken}` }
      : dbHeaders;
    await fetch(`${SUPABASE_URL}/rest/v1/chats?id=eq.${chatId}`, { method: 'DELETE', headers });
  }
};
