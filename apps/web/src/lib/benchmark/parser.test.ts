import { describe, expect, it } from "vitest";

import { parseDataRecords } from "./parser";

describe("parseDataRecords", () => {
  it("parses quoted commas, escaped quotes, and multiline cells", () => {
    expect(parseDataRecords('prompt,note\n"hello, world","say ""hi""\nsecond line"')).toEqual([
      { prompt: "hello, world", note: 'say "hi"\nsecond line' },
    ]);
  });

  it("auto-detects semicolon delimited data", () => {
    expect(parseDataRecords("prompt;negative;positive\nQuestion;No;Yes")).toEqual([
      { prompt: "Question", negative: "No", positive: "Yes" },
    ]);
  });

  it("keeps duplicate headers instead of dropping a column", () => {
    expect(parseDataRecords("prompt,prompt\nfirst,second")).toEqual([
      { prompt: "first", prompt_2: "second" },
    ]);
  });
});
