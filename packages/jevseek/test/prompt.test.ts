import { describe, expect, it } from "vitest";
import {
  buildPrompt,
  getQuestionCodes,
  JevSeekValidationError,
  stableStringify,
} from "../src";

describe("stableStringify", () => {
  it("sorts object keys recursively while preserving arrays", () => {
    expect(
      stableStringify({ z: 1, nested: { b: 2, a: 1 }, values: [3, 1] }),
    ).toBe('{"nested":{"a":1,"b":2},"values":[3,1],"z":1}');
  });

  it("rejects circular values", () => {
    const value: Record<string, unknown> = {};
    value.self = value;
    expect(() => stableStringify(value)).toThrow(JevSeekValidationError);
  });
});

describe("buildPrompt", () => {
  it("keeps state stable and maps choice criteria to codes", () => {
    const prompt = buildPrompt(
      { b: 2, a: 1 },
      {
        type: "choice",
        instructions: { task: "Classify", order: ["a", "b"] },
        criteria: { second: "Second option", first: "First option" },
      },
    );

    expect(prompt).toContain('<state>\n{"a":1,"b":2}\n</state>');
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

    expect(prompt).toContain('<state>\n["one","two"]\n</state>');
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
    expect(
      getQuestionCodes({ type: "noul", instructions: "Yes?" }),
    ).toEqual(["0", "1"]);
  });
});
