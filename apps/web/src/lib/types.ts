import type { JevSeekProvider } from "@lenml/jevseek";

export interface RawRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
}

export interface RawExchange {
  request: RawRequest;
  status: number;
  statusText: string;
  durationMs: number;
  response: unknown;
}

export interface ConnectionSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  provider: JevSeekProvider;
  promptTemplate: string;
}

export type KeyStorageMode = "session" | "local";
export const SUPPORTED_LANGUAGES = ["en", "zh", "ja", "ko"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && SUPPORTED_LANGUAGES.includes(value as Language);
}
