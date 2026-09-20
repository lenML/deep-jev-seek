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
}

export type KeyStorageMode = "session" | "local";
