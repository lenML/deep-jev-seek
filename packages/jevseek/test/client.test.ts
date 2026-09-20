import { describe, expect, it, vi } from "vitest";
import {
  createJevSeek,
  JevSeekHttpError,
  JevSeekNetworkError,
  type DeepSeekFimCompletion,
  type FimTransport,
} from "../src";
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

describe("JevSeekClient", () => {
  it("returns Jev-shaped choice, score, and noul answers", async () => {
    const transport = makeTransport(async (request) => {
      if (request.prompt.includes('"type":"choice"')) {
        return completion("A", { A: -0.1, B: -2, C: -4 });
      }
      if (request.prompt.includes('"type":"score"')) {
        return completion("2", { "0": -3, "1": -1, "2": -0.1 });
      }
      return completion("1", { "0": -2, "1": -0.1 });
    });
    const client = createJevSeek({ transport });

    const result = await client.systemOne({
      state: { message: "urgent" },
      questions: {
        route: {
          type: "choice",
          instructions: "Pick a route",
          criteria: { billing: null, technical: "Bug", sales: "Pricing" },
        },
        severity: {
          type: "score",
          instructions: "Score severity",
          criteria: ["low", "medium", "high"],
        },
        urgent: {
          type: "noul",
          instructions: "Is it urgent?",
        },
      },
    });

    expect(result.answers.route).toMatchObject({
      type: "choice",
      choice: "billing",
    });
    expect(result.answers.severity).toMatchObject({
      type: "score",
      legend: { "0": "low", "1": "medium", "2": "high" },
    });
    expect(result.answers.urgent).toEqual({ type: "noul", noul: 0.8698915256370021 });
    expect(result.usage).toEqual({ input_tokens: 36, output_tokens: 3 });
  });

  it("applies client and request prompt templates", async () => {
    const prompts: string[] = [];
    const transport = makeTransport(async (request) => {
      prompts.push(request.prompt);
      return completion("1", { "0": -2, "1": -0.1 });
    });
    const client = createJevSeek({
      transport,
      promptTemplate: "client {{questionType}} {{state}} {{question}} {{codes}}",
    });
    const question = {
      type: "noul" as const,
      instructions: "Is it urgent?",
    };

    await client.systemOne({ state: "first", questions: { q: question } });
    await client.systemOne({
      state: "second",
      questions: { q: question },
      promptTemplate: ({ codeList, state }) => `request ${state} ${codeList}`,
    });

    expect(prompts[0]).toContain("client noul");
    expect(prompts[0]).toContain('"first"');
    expect(prompts[1]).toBe('request "second" 0, 1');
  });
  it("limits concurrent question requests", async () => {
    let active = 0;
    let maximum = 0;
    const transport = makeTransport(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
      return completion("A", { A: -0.1, B: -2 });
    });
    const client = createJevSeek({ transport, concurrency: 2 });

    await client.systemOne({
      state: "state",
      questions: Object.fromEntries(
        Array.from({ length: 5 }, (_, index) => [
          `q${index}`,
          {
            type: "choice" as const,
            instructions: "Pick",
            criteria: { a: "A", b: "B" },
          },
        ]),
      ),
    });

    expect(maximum).toBe(2);
  });

  it("retries transient failures and reports attempts in diagnostics", async () => {
    let attempts = 0;
    const transport: FimTransport = {
      async complete() {
        attempts += 1;
        if (attempts === 1) {
          throw new JevSeekNetworkError("temporary");
        }
        return completion("A", { A: -0.1, B: -2 });
      },
    };
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
          criteria: { a: "A", b: "B" },
        },
      },
      debug: true,
    });

    expect(attempts).toBe(2);
    expect(result.diagnostics?.questions.q?.attempts).toBe(2);
  });

  it("does not retry non-retryable HTTP errors", async () => {
    const complete = vi.fn(async () => {
      throw new JevSeekHttpError("bad request", {
        status: 400,
        code: "REQUEST_ERROR",
        retryable: false,
      });
    });
    const client = createJevSeek({
      transport: { complete },
      retry: { maxAttempts: 3, baseDelayMs: 0, maxDelayMs: 0, jitter: false },
    });

    await expect(
      client.systemOne({
        state: "state",
        questions: {
          q: {
            type: "noul",
            instructions: "Is it true?",
          },
        },
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
