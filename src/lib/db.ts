import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.json');

export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  createdAt: string;
  settings: {
    theme: 'dark' | 'light';
    language: string;
    personalIntelligence: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface DB {
  users: User[];
  chats: ChatSession[];
}

export function readDB(): DB {
  if (!fs.existsSync(dbPath)) {
    const initialDB: DB = { users: [], chats: [] };
    fs.writeFileSync(dbPath, JSON.stringify(initialDB, null, 2));
    return initialDB;
  }
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { users: [], chats: [] };
  }
}

export function writeDB(db: DB) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}
