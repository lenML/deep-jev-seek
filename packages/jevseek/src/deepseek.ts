import {
  JevSeekAbortError,
  JevSeekAuthenticationError,
  JevSeekHttpError,
  JevSeekNetworkError,
  JevSeekParseError,
  JevSeekRateLimitError,
  JevSeekRequestError,
  JevSeekServerError,
} from "./errors";
import { parseRetryAfter } from "./retry";
import type {
  DeepSeekFimCompletion,
  DeepSeekFimRequest,
  DeepSeekLogprobs,
  DeepSeekUsage,
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLogprobs(value: unknown): DeepSeekLogprobs | undefined {
  if (value == null) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new JevSeekParseError("completion logprobs must be an object");
  }

  const logprobs: DeepSeekLogprobs = {};

  if (value.tokens !== undefined) {
    if (!Array.isArray(value.tokens)) {
      throw new JevSeekParseError("completion logprobs.tokens must be an array");
    }
    logprobs.tokens = value.tokens.map((token) =>
      typeof token === "string" || token === null ? token : null,
    );
  }

  if (value.token_logprobs !== undefined) {
    if (!Array.isArray(value.token_logprobs)) {
      throw new JevSeekParseError(
        "completion logprobs.token_logprobs must be an array",
      );
    }
    logprobs.token_logprobs = value.token_logprobs.map((logprob) =>
      typeof logprob === "number" && Number.isFinite(logprob) ? logprob : null,
    );
  }

  if (value.top_logprobs !== undefined) {
    if (!Array.isArray(value.top_logprobs)) {
      throw new JevSeekParseError(
        "completion logprobs.top_logprobs must be an array",
      );
    }
    logprobs.top_logprobs = value.top_logprobs.map((entry) => {
      if (!isRecord(entry)) {
        throw new JevSeekParseError("each top_logprobs entry must be an object");
      }
      return Object.fromEntries(
        Object.entries(entry).filter(
          (item): item is [string, number] =>
            typeof item[1] === "number" && Number.isFinite(item[1]),
        ),
      );
    });
  }

  return logprobs;
}

function nonNegativeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

function parseUsage(value: unknown): DeepSeekUsage {
  if (value === undefined || value === null) {
    return { prompt_tokens: 0, completion_tokens: 0 };
  }
  if (!isRecord(value)) {
    throw new JevSeekParseError("completion usage must be an object");
  }

  const details = isRecord(value.prompt_tokens_details)
    ? value.prompt_tokens_details
    : undefined;
  const usage: DeepSeekUsage = {
    prompt_tokens: nonNegativeNumber(value.prompt_tokens),
    completion_tokens: nonNegativeNumber(value.completion_tokens),
  };

  if (typeof value.total_tokens === "number") {
    usage.total_tokens = nonNegativeNumber(value.total_tokens);
  }
  if (details !== undefined) {
    usage.prompt_tokens_details = {
      cached_tokens: nonNegativeNumber(details.cached_tokens),
      prompt_cache_hit_tokens: nonNegativeNumber(details.prompt_cache_hit_tokens),
      prompt_cache_miss_tokens: nonNegativeNumber(details.prompt_cache_miss_tokens),
    };
  }
  return usage;
}

function parseCompletion(
  raw: unknown,
  headerRequestId?: string,
): DeepSeekFimCompletion {
  if (!isRecord(raw)) {
    throw new JevSeekParseError("completion response must be an object");
  }
  if (!Array.isArray(raw.choices) || raw.choices.length === 0) {
    throw new JevSeekParseError("completion response has no choices");
  }

  const first = raw.choices[0];
  if (!isRecord(first) || typeof first.text !== "string") {
    throw new JevSeekParseError("completion response choice has no text");
  }

  const completion: DeepSeekFimCompletion = {
    text: first.text,
    usage: parseUsage(raw.usage),
    raw,
  };

  const logprobs = parseLogprobs(first.logprobs);
  if (logprobs !== undefined) {
    completion.logprobs = logprobs;
  }
  if (typeof raw.id === "string") {
    completion.id = raw.id;
  }
  if (typeof raw.model === "string") {
    completion.model = raw.model;
  }
  const requestId =
    headerRequestId ?? (typeof raw.id === "string" ? raw.id : undefined);
  if (requestId !== undefined) {
    completion.requestId = requestId;
  }
  return completion;
}

function responseMessage(body: unknown, status: number): string {
  if (isRecord(body) && isRecord(body.error)) {
    const message = body.error.message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }
  return `DeepSeek request failed with status ${status}`;
}

function httpError(
  status: number,
  body: unknown,
  headers: Headers,
): JevSeekHttpError {
  const requestId = headers.get("x-request-id") ?? undefined;
  const options = {
    status,
    requestId,
    responseBody: body,
  };
  const message = responseMessage(body, status);

  if (status === 401 || status === 403) {
    return new JevSeekAuthenticationError(message, options);
  }
  if (status === 429) {
    return new JevSeekRateLimitError(message, {
      ...options,
      retryAfterMs: parseRetryAfter(headers.get("retry-after")),
    });
  }
  if (status >= 500) {
    return new JevSeekServerError(message, options);
  }
  if (status >= 400 && status < 500) {
    return new JevSeekRequestError(message, options);
  }
  return new JevSeekHttpError(message, options);
}

async function readResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text === "") {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new JevSeekParseError("DeepSeek response is not valid JSON", {
      status: response.status,
      requestId: response.headers.get("x-request-id") ?? undefined,
      cause: error,
    });
  }
}

export class DeepSeekFimTransport implements FimTransport {
  readonly apiKey?: string;
  readonly baseUrl: string;
  readonly headers?: HeadersInit;
  private readonly fetchImpl: typeof fetch;

  constructor(options: DeepSeekFimTransportOptions = {}) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.headers = options.headers;
    this.fetchImpl =
      options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  }

  async complete(
    request: DeepSeekFimRequest,
    context: FimTransportContext,
  ): Promise<DeepSeekFimCompletion> {
    const headers = new Headers(this.headers);
    headers.set("content-type", "application/json");
    if (this.apiKey !== undefined) {
      headers.set("authorization", `Bearer ${this.apiKey}`);
    }

    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(request),
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
