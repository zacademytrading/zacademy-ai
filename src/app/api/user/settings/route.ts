import { NextRequest, NextResponse } from 'next/server';
import { readDB, writeDB } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { userId, settings } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    const db = readDB();
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    db.users[userIndex].settings = { ...db.users[userIndex].settings, ...settings };
    writeDB(db);

    return NextResponse.json({ success: true, user: db.users[userIndex] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
