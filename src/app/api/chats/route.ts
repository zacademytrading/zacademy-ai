import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB, ChatSession } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const db = readDB();
  const userChats = db.chats.filter(c => c.userId === userId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return NextResponse.json({ chats: userChats });
}

export async function POST(req: NextRequest) {
  try {
    const { userId, chat } = await req.json();
    if (!userId || !chat) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const db = readDB();
    const existingIndex = db.chats.findIndex(c => c.id === chat.id);
    
    if (existingIndex > -1) {
      db.chats[existingIndex] = { ...chat, updatedAt: new Date().toISOString() };
    } else {
      db.chats.push({ ...chat, userId, updatedAt: new Date().toISOString() });
    }
    
    writeDB(db);
    return NextResponse.json({ success: true, chat });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const chatId = searchParams.get('chatId');
    if (!userId || !chatId) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const db = readDB();
    db.chats = db.chats.filter(c => !(c.userId === userId && c.id === chatId));
    writeDB(db);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

