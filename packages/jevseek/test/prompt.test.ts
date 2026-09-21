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
  it("uses a completion-style default ending with a boxed answer", () => {
    const prompt = buildPrompt("state", {
      type: "noul",
      instructions: "Is it true?",
    });

    expect(prompt.startsWith("Complete the classification task below.")).toBe(true);
    expect(prompt.endsWith("Answer code: \\boxed{")).toBe(true);
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

    expect(prompt).toContain('Source state:\n{"a":1,"b":2}');
    expect(prompt).toContain('"A":{"description":"Second option","id":"second"}');
    expect(prompt).toContain('"B":{"description":"First option","id":"first"}');
    expect(prompt).toContain("Allowed codes: A, B");
  });

  it("supports array state and score criteria", () => {
    const prompt = buildPrompt(["one", "two"], {
      type: "score",
      instructions: ["Score it"],
      criteria: ["low", "middle", "high"],
    });

    expect(prompt).toContain('Source state:\n["one","two"]');
    expect(prompt).toContain(
      '"criteria":[{"code":"0","description":"low"},{"code":"1","description":"middle"},{"code":"2","description":"high"}]',
    );
    expect(prompt).toContain("Allowed codes: 0, 1, 2");
  });

  it("encodes noul as false and true", () => {
    const prompt = buildPrompt("urgent", {
      type: "noul",
      instructions: "Is it urgent?",
      criteria: { false: "No urgency", true: "Urgent" },
    });

    expect(prompt).toContain('"0":{"description":"No urgency","value":false}');
    expect(prompt).toContain('"1":{"description":"Urgent","value":true}');
    expect(prompt).toContain("Allowed codes: 0, 1");
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
