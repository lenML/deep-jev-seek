import { describe, expect, it } from "vitest";
import { createJevSeek, type DeepSeekFimCompletion } from "../src";
import { makeTransport } from "./helpers";

function completion(
  text: string,
  top: Record<string, number>,
  model = "deepseek-flash",
): DeepSeekFimCompletion {
  return {
    text,
    model,
    logprobs: {
      tokens: [text],
      token_logprobs: [top[text] ?? -0.1],
      top_logprobs: [top],
    },
    usage: { prompt_tokens: 12, completion_tokens: 1 },
    raw: {},
  };
}

describe("missing candidate logprobs", () => {
  it("retries with the provider fallback prompt when candidates are missing", async () => {
    const prompts: string[] = [];
    const transport = makeTransport(async (request) => {
      prompts.push(request.prompt);
      if (request.prompt.includes('answer == "')) {
        return completion("A", { A: -0.1, B: -2 });
      }
      return completion("10", { "10": -0.1 });
    });
    const client = createJevSeek({
      transport,
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, jitter: false },
    });

    const result = await client.systemOne({
      state: "state",
      questions: {
        q: {
          type: "choice",
          instructions: "Pick",
          criteria: { a: "0", b: "10" },
        },
      },
      debug: true,
    });

    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain('answer == "');
    expect(result.answers.q).toMatchObject({ type: "choice", choice: "a" });
    expect(result.usage).toEqual({ input_tokens: 24, output_tokens: 2 });
  });

  it("supports request-level fallback template overrides", async () => {
    const prompts: string[] = [];
    const transport = makeTransport(async (request) => {
      prompts.push(request.prompt);
      return request.prompt.startsWith("fallback")
        ? completion("A", { A: -0.1, B: -2 })
        : completion("10", { "10": -0.1 });
    });
    const client = createJevSeek({
      transport,
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, jitter: false },
    });

    const result = await client.systemOne({
      state: "state",
      questions: {
        q: {
          type: "choice",
          instructions: "Pick",
          criteria: { a: "0", b: "10" },
        },
      },
      fallbackPromptTemplate: "fallback {{codes}}",
    });

    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toBe("fallback A, B");
    expect(result.answers.q).toMatchObject({ type: "choice", choice: "a" });
  });

  it("returns zero probabilities after strict fallback still has no candidates", async () => {
    const transport = makeTransport(async () => completion("10", { "10": -0.1 }));
    const client = createJevSeek({
      transport,
      missingLogprobPolicy: "zero",
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, jitter: false },
    });

    const result = await client.systemOne({
      state: "state",
      questions: {
        q: {
          type: "choice",
          instructions: "Pick",
          criteria: { a: "0", b: "10" },
        },
      },
      debug: true,
    });

    expect(result.answers.q).toEqual({
      type: "choice",
      choice: "a",
      probabilities: { a: 0, b: 0 },
      confidence: 0,
    });
    expect(result.diagnostics?.questions.q?.missingLogprobsFallback).toBe("zero");
    expect(result.usage).toEqual({ input_tokens: 24, output_tokens: 2 });
  });

  it("can retain strict parse errors", async () => {
    const transport = makeTransport(async () => completion("10", { "10": -0.1 }));
    const client = createJevSeek({
      transport,
      missingLogprobPolicy: "error",
      retry: { maxAttempts: 2, baseDelayMs: 0, maxDelayMs: 0, jitter: false },
    });

    await expect(
      client.systemOne({
        state: "state",
        questions: {
          q: {
            type: "choice",
            instructions: "Pick",
            criteria: { a: "0", b: "10" },
          },
        },
      }),
    ).rejects.toMatchObject({ code: "PARSE_ERROR" });
  });
});
