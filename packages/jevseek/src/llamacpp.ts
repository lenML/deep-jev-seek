import { JevSeekAbortError, JevSeekNetworkError, JevSeekParseError } from "./errors";
import { httpError, readResponse } from "./deepseek-response";
import type {
  CompletionTransportRequest,
  DeepSeekFimCompletion,
  DeepSeekLogprobs,
  DeepSeekUsage,
  FimTransport,
  FimTransportContext,
  LLamaCppCompletionRequest,
} from "./types";

export interface LLamaCppFimTransportOptions {
  apiKey?: string;
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: HeadersInit;
}

const DEFAULT_BASE_URL = "http://127.0.0.1:8080/v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function tokenLogprob(value: Record<string, unknown>): number | undefined {
  const logprob = finiteNumber(value.logprob);
  if (logprob !== undefined) {
    return logprob;
  }
  const probability = finiteNumber(value.prob);
  return probability !== undefined && probability > 0 ? Math.log(probability) : undefined;
}

function parseLogprobs(raw: Record<string, unknown>): DeepSeekLogprobs | undefined {
  const completions = raw.completion_probabilities;
  if (!Array.isArray(completions) || completions.length === 0 || !isRecord(completions[0])) {
    return undefined;
  }

  const first = completions[0];
  const sampledToken = typeof first.token === "string" ? first.token : undefined;
  const sampledLogprob = tokenLogprob(first);
  const entries = Array.isArray(first.top_logprobs)
    ? first.top_logprobs
    : Array.isArray(first.top_probs)
      ? first.top_probs
      : [];
  const topLogprobs = Object.fromEntries(
    entries.flatMap((entry) => {
      if (!isRecord(entry) || typeof entry.token !== "string") {
        return [];
      }
      const logprob = tokenLogprob(entry);
      return logprob === undefined ? [] : [[entry.token, logprob] as const];
    }),
  );

  if (sampledToken === undefined && Object.keys(topLogprobs).length === 0) {
    return undefined;
  }
  return {
    ...(sampledToken === undefined ? {} : { tokens: [sampledToken] }),
    ...(sampledLogprob === undefined ? {} : { token_logprobs: [sampledLogprob] }),
    ...(Object.keys(topLogprobs).length === 0 ? {} : { top_logprobs: [topLogprobs] }),
  };
}

function parseUsage(raw: Record<string, unknown>): DeepSeekUsage {
  const promptTokens = finiteNumber(raw.tokens_evaluated) ?? 0;
  const completionTokens = finiteNumber(raw.tokens_predicted) ?? 0;
  return {
    prompt_tokens: Math.max(0, promptTokens),
    completion_tokens: Math.max(0, completionTokens),
    total_tokens: Math.max(0, promptTokens + completionTokens),
  };
}

function parseCompletion(raw: unknown, requestId?: string): DeepSeekFimCompletion {
  if (!isRecord(raw) || typeof raw.content !== "string") {
    throw new JevSeekParseError("llama.cpp completion response has no content");
  }

  return {
    text: raw.content,
    logprobs: parseLogprobs(raw),
    usage: parseUsage(raw),
    ...(typeof raw.model === "string" ? { model: raw.model } : {}),
    ...(requestId === undefined ? {} : { requestId }),
    raw,
  };
}

function nativeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "").replace(/\/v1$/u, "");
}

export class LLamaCppFimTransport implements FimTransport {
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly headers?: HeadersInit;
  private readonly fetchImpl: typeof fetch;

  constructor(options: LLamaCppFimTransportOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = nativeBaseUrl(options.baseUrl ?? DEFAULT_BASE_URL);
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

    const prompt: LLamaCppCompletionRequest["prompt"] = request.multimodal_data
      ? {
          prompt_string: request.prompt,
          multimodal_data: request.multimodal_data,
        }
      : request.prompt;
    const body: LLamaCppCompletionRequest = {
      n_predict: request.maxTokens,
      temperature: request.temperature,
      top_p: request.topP,
      n_probs: request.topLogprobs,
      ...request.providerOptions,
      model: request.model,
      prompt,
      stream: false,
    };

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/completion`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: context.signal,
      });
    } catch (error) {
      if (context.signal.aborted) {
        throw new JevSeekAbortError(undefined, error);
      }
      throw new JevSeekNetworkError(undefined, error);
    }

    let parsedBody: unknown;
    try {
      parsedBody = await readResponse(response);
    } catch (error) {
      if (response.ok) {
        throw error;
      }
      throw new JevSeekParseError("llama.cpp error response is not valid JSON", {
        status: response.status,
        responseBody: undefined,
        cause: error,
      });
    }

    const requestId = response.headers.get("x-request-id") ?? undefined;
    if (!response.ok) {
      throw httpError(response.status, parsedBody, response.headers);
    }
    return parseCompletion(parsedBody, requestId);
  }
}

export function createLLamaCppFimTransport(
  options: LLamaCppFimTransportOptions = {},
): LLamaCppFimTransport {
  return new LLamaCppFimTransport(options);
}
