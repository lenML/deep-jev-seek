import { describe, expect, it } from "vitest";
import { computeConfidence, encodeChoiceAnswer, encodeNoulAnswer, encodeScoreAnswer } from "../src";

describe("answer encoding", () => {
  it("encodes choice with original keys and separate confidence", () => {
    const answer = encodeChoiceAnswer(
      {
        type: "choice",
        instructions: "Pick",
        criteria: { left: "Move left", right: "Move right" },
      },
      { A: 0.6, B: 0.4 },
    );

    expect(answer).toEqual({
      type: "choice",
      choice: "left",
      probabilities: { left: 0.6, right: 0.4 },
      confidence: 0.19999999999999996,
    });
  });

  it("encodes score as probability-weighted index with legend", () => {
    const answer = encodeScoreAnswer(
      {
        type: "score",
        instructions: "How bad?",
        criteria: ["low", "medium", "high"],
      },
      { "0": 0.1, "1": 0.3, "2": 0.6 },
    );

    expect(answer.score).toBeCloseTo(1.5);
    expect(answer.legend).toEqual({ "0": "low", "1": "medium", "2": "high" });
    expect(answer.confidence).toBeCloseTo(0.4);
  });

  it("encodes noul as probability of true without confidence", () => {
    expect(
      encodeNoulAnswer({ type: "noul", instructions: "Urgent?" }, { "0": 0.18, "1": 0.82 }),
    ).toEqual({ type: "noul", noul: 0.82 });
  });

  it("returns one for a single candidate", () => {
    expect(computeConfidence({ A: 1 })).toBe(1);
  });
});
