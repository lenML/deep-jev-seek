import type {
  DeepSeekFimCompletion,
  DeepSeekFimRequest,
  FimTransport,
} from "../src";

export function completionBody(
  text: string,
  topLogprobs: Array<Record<string, number>>,
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } = {},
): Record<string, unknown> {
  return {
    id: "completion-id",
    model: "deepseek-flash",
    choices: [
      {
        text,
        logprobs: {
          tokens: [text],
          token_logprobs: [topLogprobs[0]?.[text] ?? -0.1],
          top_logprobs: topLogprobs,
        },
      },
    ],
    usage: {
      prompt_tokens: usage.prompt_tokens ?? 10,
      completion_tokens: usage.completion_tokens ?? 1,
      total_tokens: usage.total_tokens ?? 11,
    },
  };
}

export function jsonResponse(
  body: unknown,
  init: ResponseInit = {},
): Response {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function completionResponse(
  text: string,
  topLogprobs: Array<Record<string, number>>,
  usage: Parameters<typeof completionBody>[2] = {},
): Response {
  return jsonResponse(completionBody(text, topLogprobs, usage), {
    status: 200,
    headers: { "x-request-id": "request-id" },
  });
}

export function makeTransport(
  implementation: (
    request: DeepSeekFimRequest,
    signal: AbortSignal,
  ) => Promise<DeepSeekFimCompletion>,
): FimTransport {
  return {
    complete: (request, context) => implementation(request, context.signal),
  };
}
