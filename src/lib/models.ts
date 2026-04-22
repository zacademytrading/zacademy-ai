// src/lib/models.ts
// ZAcademy AI Models — ZENIX Engine

export const ZACADEMY_MODELS = {
  "zenix-think": {
    name: "ZENIX Think",
    desc: "Berpikir mendalam & akurat (Deep Reasoning)",
    groqModel: "llama-3.3-70b-versatile",
    temperature: 0.2,
  },
  "zenix-fast": {
    name: "ZENIX Fast",
    desc: "Respons instan & cepat (Real-time)",
    groqModel: "llama-3.1-8b-instant",
    temperature: 0.4,
  }
} as const;

export type ModelKey = keyof typeof ZACADEMY_MODELS;
