import { createDeepSeekFimTransport } from "./deepseek";
import { createLLamaCppFimTransport } from "./llamacpp";
import type { FimTransport, JevSeekOptions, JevSeekProvider } from "./types";

export function createTransport(options: JevSeekOptions, provider: JevSeekProvider): FimTransport {
  if (options.transport !== undefined) {
    return options.transport;
  }

  const transportOptions = {
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
    fetch: options.fetch,
    headers: options.headers,
  };
  return provider === "llamacpp"
    ? createLLamaCppFimTransport(transportOptions)
    : createDeepSeekFimTransport(transportOptions);
}
