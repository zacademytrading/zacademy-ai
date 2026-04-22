import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB, User } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { action, email, password, name } = await req.json();
    const db = readDB();

    if (action === 'google') {
      // Mock Google Login / Registration
      let user = db.users.find(u => u.email === email);
      if (!user) {
        user = {
          id: 'user_' + Date.now(),
          email,
          name: name || email.split('@')[0],
          createdAt: new Date().toISOString(),
          settings: {
            theme: 'dark',
            language: 'Bahasa Indonesia',
            personalIntelligence: '',
          }
        };
        db.users.push(user);
        writeDB(db);
      }
      return NextResponse.json({ success: true, user });
    }

    if (action === 'register') {
      if (db.users.find(u => u.email === email)) {
        return NextResponse.json({ error: 'Email sudah terdaftar!' }, { status: 400 });
      }
      const user: User = {
        id: 'user_' + Date.now(),
        email,
        password, // Not hashed for simplicity since this is local db demo
        name: name || email.split('@')[0],
        createdAt: new Date().toISOString(),
        settings: {
          theme: 'dark',
          language: 'Bahasa Indonesia',
          personalIntelligence: '',
        }
      };
      db.users.push(user);
      writeDB(db);
      return NextResponse.json({ success: true, user });
    }

    if (action === 'login') {
      const user = db.users.find(u => u.email === email && u.password === password);
      if (!user) {
        return NextResponse.json({ error: 'Email atau password salah!' }, { status: 401 });
      }
      return NextResponse.json({ success: true, user });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
