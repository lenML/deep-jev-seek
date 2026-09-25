import { describe, expect, it } from "vitest";
import { validateQuestion, validateQuestions } from "../src";

describe("question validation", () => {
  it("rejects empty questions and zero-option choice or score questions", () => {
    expect(() => validateQuestions({})).toThrow("questions must contain at least one question");
    expect(() =>
      validateQuestion({
        type: "choice",
        instructions: "Pick",
        criteria: {},
      }),
    ).toThrow("criteria must contain between 1 and 20 options");
    expect(() =>
      validateQuestion({
        type: "score",
        instructions: "Score",
        criteria: [],
      }),
    ).toThrow("criteria must contain between 1 and 10 levels");
  });

  it("rejects empty or whitespace-only labels", () => {
    expect(() =>
      validateQuestion({
        type: "choice",
        instructions: "Pick",
        criteria: { empty: " " },
      }),
    ).toThrow("question.criteria.empty must not be empty");
    expect(() =>
      validateQuestion({
        type: "choice",
        instructions: "Pick",
        criteria: { " ": null },
      }),
    ).toThrow("question.criteria key must not be empty");
    expect(() =>
      validateQuestion({
        type: "score",
        instructions: "Score",
        criteria: [""],
      }),
    ).toThrow("question.criteria.0 must not be empty");
    expect(() =>
      validateQuestion({
        type: "noul",
        instructions: "True?",
        criteria: { true: "\t" },
      }),
    ).toThrow("question.criteria.true must not be empty");
  });

  it("accepts one choice option and a null description with a key label", () => {
    expect(() =>
      validateQuestion({
        type: "choice",
        instructions: "Pick",
        criteria: { only: null },
      }),
    ).not.toThrow();
  });
});
