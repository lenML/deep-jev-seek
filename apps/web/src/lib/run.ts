import {
  createJevSeek,
  type JevSeekResponse,
  type JevState,
  type QuestionSet,
} from "@lenml/jevseek";

import type { ConnectionSettings, RawExchange, RawRequest } from "@/lib/types";

interface RunJevSeekInput {
  connection: ConnectionSettings;
  state: unknown;
  questions: QuestionSet;
}

export interface RunJevSeekOutput {
  result: JevSeekResponse;
  rawExchanges: RawExchange[];
  latencyMs: number;
}

function redactHeaders(headers?: HeadersInit): Record<string, string> {
  const result: Record<string, string> = {};
  new Headers(headers).forEach((value, key) => {
    result[key] =
      key.toLowerCase() === "authorization"
        ? value.replace(/^(Bearer\s+).+$/i, "$1sk-...redacted")
        : value;
  });
  return result;
}

function parseRequestBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== "string") {
    return body ? "[non-text body omitted]" : null;
  }
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.clone().text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function runJevSeek({
  connection,
  state,
  questions,
}: RunJevSeekInput): Promise<RunJevSeekOutput> {
  const rawExchanges: RawExchange[] = [];
  const recordingFetch: typeof fetch = async (input, init) => {
    const startedAt = performance.now();
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const request: RawRequest = {
      method: init?.method ?? (input instanceof Request ? input.method : "GET"),
      url,
      headers: redactHeaders(init?.headers ?? (input instanceof Request ? input.headers : undefined)),
      body: parseRequestBody(init?.body),
    };

    const response = await fetch(input, init);
    rawExchanges.push({
      request,
      status: response.status,
      statusText: response.statusText,
      durationMs: Math.round(performance.now() - startedAt),
      response: await parseResponseBody(response),
    });
    return response;
  };

  const startedAt = performance.now();
  const client = createJevSeek({
    apiKey: connection.apiKey.trim(),
    baseUrl: connection.baseUrl.trim(),
    model: connection.model.trim(),
    timeoutMs: 90_000,
    fetch: recordingFetch,
  });
  const result = await client.systemOne({
    state: state as JevState,
    questions,
    debug: true,
  });

  return {
    result,
    rawExchanges,
    latencyMs: Math.round(performance.now() - startedAt),
  };
}
