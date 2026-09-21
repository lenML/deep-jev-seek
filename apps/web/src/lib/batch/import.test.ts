import { describe, expect, it } from "vitest";

import { parseBatchText } from "./import";

describe("parseBatchText", () => {
  it("imports CSV option headers and prompts", () => {
    const batch = parseBatchText('prompt,negative,neutral,positive\n"hello, world",bad,okay,good');

    expect(batch.columns.map((column) => column.text)).toEqual(["negative", "neutral", "positive"]);
    expect(batch.rows).toHaveLength(1);
    expect(batch.rows[0]?.prompt).toBe("hello, world");
  });

  it("imports JSONL records with option values", () => {
    const batch = parseBatchText(
      '{"prompt":"first","options":["negative","positive"]}\n{"prompt":"second","options":["no","yes"]}',
    );

    expect(batch.columns.map((column) => column.text)).toEqual(["negative", "positive"]);
    expect(batch.rows.map((row) => row.prompt)).toEqual(["first", "second"]);
  });
});
