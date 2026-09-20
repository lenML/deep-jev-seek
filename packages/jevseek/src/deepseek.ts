import { JevSeekAbortError, JevSeekNetworkError, JevSeekParseError } from "./errors";
import { httpError, parseCompletion, readResponse } from "./deepseek-response";
import type {
  CompletionTransportRequest,
  DeepSeekFimCompletion,
  DeepSeekFimRequest,
  FimTransport,
  FimTransportContext,
} from "./types";

export interface DeepSeekFimTransportOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: HeadersInit;
}

const DEFAULT_BASE_URL = "https://api.deepseek.com/beta";

export class DeepSeekFimTransport implements FimTransport {
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly headers?: HeadersInit;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DeepSeekFimTransportOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.headers = options.headers;
    this.fetchImpl = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  async complete(
    request: CompletionTransportRequest,
    context: FimTransportContext,
  ): Promise<DeepSeekFimCompletion> {
    const headers = new Headers(this.headers);
    headers.set("content-type", "application/json");
    if (this.apiKey !== undefined) {
      headers.set("authorization", `Bearer ${this.apiKey}`);
    }

    const requestBody: DeepSeekFimRequest = {
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      top_p: request.topP,
      logprobs: request.topLogprobs,
      ...request.providerOptions,
      model: request.model,
      prompt: request.prompt,
      stream: false,
    };

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: context.signal,
      });
    } catch (error) {
      if (context.signal.aborted) {
        throw new JevSeekAbortError(undefined, error);
      }
      throw new JevSeekNetworkError(undefined, error);
    }

    let body: unknown;
    try {
      body = await readResponse(response);
    } catch (error) {
      if (response.ok) {
        throw error;
      }
      throw new JevSeekParseError("DeepSeek error response is not valid JSON", {
        status: response.status,
        responseBody: undefined,
        cause: error,
      });
    }

    const requestId = response.headers.get("x-request-id") ?? undefined;
    if (!response.ok) {
      throw httpError(response.status, body, response.headers);
    }

    return parseCompletion(body, requestId);
  }
}

export function createDeepSeekFimTransport(
  options: DeepSeekFimTransportOptions = {},
): DeepSeekFimTransport {
  return new DeepSeekFimTransport(options);
}
