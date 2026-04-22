// src/lib/models.ts
// Daftar model AI ZAcademy - Google Gemini API

export const ZACADEMY_MODELS = {
  "zacademy-think-pro": {
    name: "ZAcademy Think Pro 🧠",
    desc: "Analisa teknikal mendalam, multi-timeframe",
    geminiModel: "gemini-2.5-pro-exp-03-25",
    temperature: 0.3,
  },
  "zacademy-signal-master": {
    name: "ZAcademy Signal Master 🎯",
    desc: "Generate entry/SL/TP dengan risk management",
    geminiModel: "gemini-2.5-pro-exp-03-25",
    temperature: 0.2,
  },
  "zacademy-market-mind": {
    name: "ZAcademy Market Mind 🌍",
    desc: "Analisa sentiment market & berita global",
    geminiModel: "gemini-2.0-flash-thinking-exp-01-21",
    temperature: 0.5,
  },
  "zacademy-lite": {
    name: "ZAcademy Lite ⚡",
    desc: "Fast response untuk quick Q&A",
    geminiModel: "gemini-2.0-flash",
    temperature: 0.4,
  },
  "zacademy-flash": {
    name: "ZAcademy Flash ⚡",
    desc: "Gemini 2.0 Flash - Ultra cepat",
    geminiModel: "gemini-2.0-flash-lite",
    temperature: 0.4,
  }
} as const;

export type ModelKey = keyof typeof ZACADEMY_MODELS;
