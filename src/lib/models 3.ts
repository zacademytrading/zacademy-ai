// src/lib/models.ts
// Daftar model AI ZAcademy - OpenRouter API (FREE models)

export const ZACADEMY_MODELS = {
  "zacademy-think-pro": {
    name: "ZAcademy Think Pro 🧠",
    desc: "Analisa teknikal mendalam, multi-timeframe",
    openrouterModel: "qwen/qwen3-next-80b-a3b-instruct:free", // Qwen 80B FREE
    temperature: 0.3,
  },
  "zacademy-signal-master": {
    name: "ZAcademy Signal Master 🎯",
    desc: "Generate entry/SL/TP dengan risk management",
    openrouterModel: "meta-llama/llama-3.3-70b-instruct:free", // Llama 3.3 70B FREE
    temperature: 0.2,
  },
  "zacademy-market-mind": {
    name: "ZAcademy Market Mind 🌍",
    desc: "Analisa sentiment market & berita global",
    openrouterModel: "openai/gpt-oss-120b:free", // GPT OSS 120B FREE
    temperature: 0.5,
  },
  "zacademy-lite": {
    name: "ZAcademy Lite ⚡",
    desc: "Fast response untuk quick Q&A",
    openrouterModel: "google/gemma-3-12b-it:free", // Gemma 12B FREE
    temperature: 0.4,
  },
  "zacademy-coder": {
    name: "ZAcademy Coder 💻",
    desc: "Qwen Coder untuk analisa data & script",
    openrouterModel: "qwen/qwen3-coder:free", // Qwen Coder FREE
    temperature: 0.3,
  }
} as const;

export type ModelKey = keyof typeof ZACADEMY_MODELS;
