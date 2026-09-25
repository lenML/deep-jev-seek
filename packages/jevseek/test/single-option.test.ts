import { describe, expect, it, vi } from "vitest";
import { createJevSeek } from "../src";

describe("single-option questions", () => {
  it("resolves choice and score locally without calling transport", async () => {
    const complete = vi.fn(async () => {
      throw new Error("transport must not be called");
    });
    const client = createJevSeek({ transport: { complete } });

    const result = await client.systemOne({
      state: "state",
      questions: {
        route: {
          type: "choice",
          instructions: "Pick the only route",
          criteria: { only: "Only route" },
        },
        severity: {
          type: "score",
          instructions: "Score severity",
          criteria: ["Only level"],
        },
      },
    });

    expect(complete).not.toHaveBeenCalled();
    expect(result.answers.route).toEqual({
      type: "choice",
      choice: "only",
      probabilities: { only: 1 },
      confidence: 1,
    });
    expect(result.answers.severity).toEqual({
      type: "score",
      score: 0,
      legend: { "0": "Only level" },
      probabilities: { "0": 1 },
      confidence: 1,
    });
    expect(result.usage).toEqual({ input_tokens: 0, output_tokens: 0 });
  });

  it("rejects invalid option sets before calling transport", async () => {
    const complete = vi.fn(async () => {
      throw new Error("transport must not be called");
    });
    const client = createJevSeek({ transport: { complete } });

    await expect(
      client.systemOne({
        state: "state",
        questions: {
          q: {
            type: "choice",
            instructions: "Pick",
            criteria: {},
          },
        },
      }),
    ).rejects.toThrow("criteria must contain between 1 and 20 options");

    await expect(
      client.systemOne({
        state: "state",
        questions: {
          q: {
            type: "score",
            instructions: "Score",
            criteria: [" "],
          },
        },
      }),
    ).rejects.toThrow("criteria.0 must not be empty");

    await expect(client.systemOne({ state: "state", questions: {} })).rejects.toThrow(
      "questions must contain at least one question",
    );
    expect(complete).not.toHaveBeenCalled();
  });
});
