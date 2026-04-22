// src/lib/models.ts
// Daftar model AI ZAcademy - OpenRouter API (FREE models - Verified Working)

export const ZACADEMY_MODELS = {
  "zacademy-think-pro": {
    name: "ZAcademy Think Pro 🧠",
    desc: "Analisa teknikal mendalam, multi-timeframe",
    openrouterModel: "google/gemini-2.5-pro-exp-03-25:free",
    temperature: 0.3,
  },
  "zacademy-signal-master": {
    name: "ZAcademy Signal Master 🎯",
    desc: "Generate entry/SL/TP dengan risk management",
    openrouterModel: "meta-llama/llama-3.3-70b-instruct:free",
    temperature: 0.2,
  },
  "zacademy-market-mind": {
    name: "ZAcademy Market Mind 🌍",
    desc: "Analisa sentiment market & berita global",
    openrouterModel: "google/gemini-2.0-flash-thinking-exp:free",
    temperature: 0.5,
  },
  "zacademy-lite": {
    name: "ZAcademy Lite ⚡",
    desc: "Fast response untuk quick Q&A",
    openrouterModel: "google/gemini-2.0-flash-exp:free",
    temperature: 0.4,
  },
  "zacademy-deep": {
    name: "ZAcademy Deep 🔮",
    desc: "Deep analysis dengan Mistral",
    openrouterModel: "mistralai/mistral-small-3.1-24b-instruct:free",
    temperature: 0.3,
  }
} as const;

export type ModelKey = keyof typeof ZACADEMY_MODELS;
