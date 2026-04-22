// src/lib/models.ts
// Daftar model AI ZAcademy - Nama keren untuk branding!

export const ZACADEMY_MODELS = {
  "zacademy-think-pro": {
    name: "ZAcademy Think Pro 🧠",
    desc: "Analisa teknikal mendalam, multi-timeframe",
    geminiModel: "gemini-2.5-flash", // Model Gemini yang dipakai
    temperature: 0.3, // Lebih fokus & konsisten
  },
  "zacademy-signal-master": {
    name: "ZAcademy Signal Master 🎯",
    desc: "Generate entry/SL/TP dengan risk management",
    geminiModel: "gemini-2.5-flash",
    temperature: 0.2, // Lebih presisi untuk signal
  },
  "zacademy-market-mind": {
    name: "ZAcademy Market Mind 🌍",
    desc: "Analisa sentiment market & berita global",
    geminiModel: "gemini-2.5-flash", 
    temperature: 0.5, // Lebih kreatif untuk analisa berita
  },
  "zacademy-lite": {
    name: "ZAcademy Lite ⚡",
    desc: "Fast response untuk quick Q&A",
    geminiModel: "gemini-2.5-flash-lite", // Model lebih ringan
    temperature: 0.4,
  }
} as const;

export type ModelKey = keyof typeof ZACADEMY_MODELS;