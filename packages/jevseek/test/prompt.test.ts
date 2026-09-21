import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  getQuestionCodes,
  JevSeekValidationError,
  renderPromptTemplate,
  stableStringify,
} from "../src";

describe("stableStringify", () => {
  it("sorts object keys recursively while preserving arrays", () => {
    expect(stableStringify({ z: 1, nested: { b: 2, a: 1 }, values: [3, 1] })).toBe(
      '{"nested":{"a":1,"b":2},"values":[3,1],"z":1}',
    );
  });

  it("rejects circular values", () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    expect(() => stableStringify(value)).toThrow(JevSeekValidationError);
  });
});

describe("buildPrompt", () => {
  it("uses a concise default with readable options and a boxed answer", () => {
    const prompt = buildPrompt("state", {
      type: "noul",
      instructions: "Is it true?",
    });

    expect(prompt.startsWith("Classify by description.")).toBe(true);
    expect(prompt).toContain("Question: Is it true?");
    expect(prompt).toContain("- 0 = false\n- 1 = true");
    expect(prompt.endsWith("Answer: \\boxed{")).toBe(true);
    expect(prompt).not.toContain("You are");
  });

  it("keeps state stable and maps choice criteria to codes", () => {
    const prompt = buildPrompt(
      { b: 2, a: 1 },
      {
        type: "choice",
        instructions: { task: "Classify", order: ["a", "b"] },
        criteria: { second: "Second option", first: "First option" },
      },
    );

    expect(prompt).toContain('State:\n{"a":1,"b":2}');
    expect(prompt).toContain('Question: {"order":["a","b"],"task":"Classify"}');
    expect(prompt).toContain("- A = Second option\n- B = First option");
  });

  it("supports array state and score criteria", () => {
    const prompt = buildPrompt(["one", "two"], {
      type: "score",
      instructions: ["Score it"],
      criteria: ["low", "middle", "high"],
    });

    expect(prompt).toContain('State:\n["one","two"]');
    expect(prompt).toContain('Question: ["Score it"]');
    expect(prompt).toContain("- 0 = low\n- 1 = middle\n- 2 = high");
  });

  it("encodes noul as false and true", () => {
    const prompt = buildPrompt("urgent", {
      type: "noul",
      instructions: "Is it urgent?",
      criteria: { false: "No urgency", true: "Urgent" },
    });

    expect(prompt).toContain("Question: Is it urgent?");
    expect(prompt).toContain("- 0 = No urgency\n- 1 = Urgent");
  });

  it("renders readable placeholders in custom templates", () => {
    const prompt = buildPrompt(
      "state",
      {
        type: "choice",
        instructions: "Pick one",
        criteria: { first: "First", second: "Second" },
      },
      undefined,
      "i={{instructions}}\no={{options}}",
    );

    expect(prompt).toBe("i=Pick one\no=- A = First\n- B = Second");
  });

  it("renders custom string templates", () => {
    const prompt = buildPrompt(
      { task: "refund" },
      {
        type: "noul",
        instructions: "Is a refund requested?",
      },
      undefined,
      "type={{questionType}}\ncodes={{codes}}\nstate={{state}}\nquestion={{question}}",
    );

    expect(prompt).toContain("type=noul");
    expect(prompt).toContain("codes=0, 1");
    expect(prompt).toContain('state={"task":"refund"}');
    expect(prompt).toContain('"instructions":"Is a refund requested?"');
  });

  it("supports function templates", () => {
    const prompt = buildPrompt(
      "urgent",
      {
        type: "noul",
        instructions: "Is it urgent?",
      },
      undefined,
      ({ questionType, codeList, state }) => `${questionType}:${codeList}:${state}`,
    );

    expect(prompt).toBe('noul:0, 1:"urgent"');
  });

  it("rejects empty template output", () => {
    expect(() =>
      renderPromptTemplate(() => "  ", {
        state: "state",
        question: "question",
        instructions: "instructions",
        options: "options",
        questionType: "noul",
        codes: ["0", "1"],
        codeList: "0, 1",
      }),
    ).toThrow(JevSeekValidationError);
  });
});

describe("getQuestionCodes", () => {
  it("uses A-T, score indexes, and binary noul codes", () => {
    expect(
      getQuestionCodes({
        type: "choice",
        instructions: "Pick",
        criteria: { a: "a", b: "b" },
      }),
    ).toEqual(["A", "B"]);
    expect(
      getQuestionCodes({
        type: "score",
        instructions: "Score",
        criteria: ["a", "b"],
      }),
    ).toEqual(["0", "1"]);
    expect(getQuestionCodes({ type: "noul", instructions: "Yes?" })).toEqual(["0", "1"]);
  });
});
