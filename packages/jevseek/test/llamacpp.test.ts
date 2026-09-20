import { describe, expect, it, vi } from "vitest";

import { createJevSeek, JevSeekValidationError, LLamaCppFimTransport } from "../src";

const responseBody = {
  content: "1",
  model: "local-model",
  tokens_evaluated: 12,
  tokens_predicted: 1,
  completion_probabilities: [
    {
      id: 1,
      token: "1",
      logprob: -0.1,
      top_logprobs: [
        { id: 1, token: "1", logprob: -0.1 },
        { id: 2, token: "0", logprob: -2 },
      ],
    },
  ],
};

describe("LLamaCppFimTransport", () => {
  it("uses /completion and maps multimodal_data", async () => {
    let requestUrl = "";
    let requestBody: Record<string, unknown> = {};
    const fetchImpl: typeof fetch = async (input, init) => {
      requestUrl = String(input);
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "content-type": "application/json", "x-request-id": "local-request" },
      });
    };
    const transport = new LLamaCppFimTransport({
      baseUrl: "http://127.0.0.1:8080/v1",
      fetch: fetchImpl,
    });

    const completion = await transport.complete(
      {
        model: "llamacpp",
        prompt: "Return 0 or 1.",
        maxTokens: 1,
        temperature: 0,
        topP: 1,
        topLogprobs: 5,
        multimodal_data: ["base64-image"],
      },
      { signal: new AbortController().signal },
    );

    expect(requestUrl).toBe("http://127.0.0.1:8080/completion");
    expect(requestBody).toMatchObject({
      model: "llamacpp",
      n_predict: 1,
      n_probs: 5,
      temperature: 0,
      top_p: 1,
      prompt: {
        prompt_string: "Return 0 or 1.",
        multimodal_data: ["base64-image"],
      },
    });
    expect(completion).toMatchObject({
      text: "1",
      model: "local-model",
      requestId: "local-request",
      usage: { prompt_tokens: 12, completion_tokens: 1, total_tokens: 13 },
      logprobs: {
        tokens: ["1"],
        token_logprobs: [-0.1],
        top_logprobs: [{ "1": -0.1, "0": -2 }],
      },
    });
  });

  it("runs SystemOne through the llama.cpp provider", async () => {
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const client = createJevSeek({
      provider: "llamacpp",
      baseUrl: "http://127.0.0.1:8080/v1",
      fetch: fetchImpl,
    });

    const result = await client.systemOne({
      state: "urgent",
      questions: {
        urgent: {
          type: "noul",
          instructions: "Is it urgent?",
        },
      },
    });

    expect(result.answers.urgent).toEqual({ type: "noul", noul: 0.8698915256370021 });
  });

  it("rejects multimodal_data for DeepSeek before sending a request", async () => {
    const complete = vi.fn(async () => ({
      text: "1",
      usage: { prompt_tokens: 1, completion_tokens: 1 },
      raw: responseBody,
    }));
    const client = createJevSeek({ transport: { complete } });

    await expect(
      client.systemOne({
        state: "state",
        questions: {
          q: { type: "noul", instructions: "Is it true?" },
        },
        multimodal_data: ["base64-image"],
      }),
    ).rejects.toThrow(JevSeekValidationError);
    expect(complete).not.toHaveBeenCalled();
  });

  it("rejects invalid multimodal_data in llama.cpp mode", async () => {
    const client = createJevSeek({ provider: "llamacpp", transport: { complete: vi.fn() } });

    await expect(
      client.systemOne({
        state: "state",
        questions: {
          q: { type: "noul", instructions: "Is it true?" },
        },
        multimodal_data: [""],
      }),
    ).rejects.toThrow(JevSeekValidationError);
  });
});
