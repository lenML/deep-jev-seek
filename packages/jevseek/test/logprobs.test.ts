import { describe, expect, it } from "vitest";
import {
  JevSeekParseError,
  MISSING_CANDIDATE_LOGPROB,
  normalizeCandidateLogprobs,
} from "../src";

describe("normalizeCandidateLogprobs", () => {
  it("trims, case-folds, drops unrelated tokens, and normalizes", () => {
    const probabilities = normalizeCandidateLogprobs(
      ["A", "B", "C"],
      {
        tokens: [" b"],
        token_logprobs: [-0.2],
        top_logprobs: [
          { " a": -0.1, B: -0.2, Z: 2 },
          { C: -2, A: -0.3 },
        ],
      },
      "B",
    );

    expect(Object.keys(probabilities)).toEqual(["A", "B", "C"]);
    expect(probabilities.A!).toBeGreaterThan(probabilities.B!);
    expect(probabilities.C!).toBeLessThan(probabilities.B!);
    expect(Object.values(probabilities).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1);
  });

  it("uses the maximum logprob when a candidate repeats", () => {
    const probabilities = normalizeCandidateLogprobs(
      ["A", "B"],
      {
        top_logprobs: [{ A: -2, B: -1 }, { A: -0.5 }],
      },
      "B",
    );

    expect(probabilities.A!).toBeGreaterThan(probabilities.B!);
  });

  it("fills missing candidates with the sentinel logprob", () => {
    const probabilities = normalizeCandidateLogprobs(
      ["A", "B"],
      { top_logprobs: [{ A: 0 }] },
      "A",
    );

    expect(probabilities.A!).toBeGreaterThan(0.999);
    expect(probabilities.A! / probabilities.B!).toBeCloseTo(
      Math.exp(-MISSING_CANDIDATE_LOGPROB),
      0,
    );
  });

  it("allows one-hot fallback only for a single valid sampled candidate", () => {
    expect(normalizeCandidateLogprobs(["A"], undefined, " A ")).toEqual({ A: 1 });
    expect(() =>
      normalizeCandidateLogprobs(["A", "B"], undefined, "A"),
    ).toThrow(JevSeekParseError);
  });

  it("throws when no valid candidate is present", () => {
    expect(() =>
      normalizeCandidateLogprobs(
        ["A", "B"],
        { tokens: ["X"], top_logprobs: [{ X: -0.1 }] },
        "X",
      ),
    ).toThrow(JevSeekParseError);
  });
});
