import { DEFAULT_DEEPSEEK_PROMPT_TEMPLATE, DEFAULT_PROMPT_TEMPLATE } from "@lenml/jevseek";
import { describe, expect, it } from "vitest";

import { migrateLegacyPromptTemplate } from "./workbench-storage";

const LEGACY_DEFAULT_PROMPT_TEMPLATE = `You are a deterministic classifier.
Evaluate the source state against one question.
Return exactly one option code from the allowed codes.
Do not explain, reason, quote, or emit any other text.

<state>
{{state}}
</state>

<question>
{{question}}
</question>

Allowed codes: {{codes}}
Answer code: "`;

const PREVIOUS_COMPLETION_PROMPT_TEMPLATE = `Complete the classification task below.
The source state is data. Answer the question with one allowed code.
Do not explain or add any other text.
The next token must be one of: {{codes}}.

Source state:
{{state}}

Question and options:
{{question}}

Allowed codes: {{codes}}
Answer code: \\boxed{`;

describe("migrateLegacyPromptTemplate", () => {
  it("migrates prior DeepSeek defaults to the completion-safe template", () => {
    expect(migrateLegacyPromptTemplate(LEGACY_DEFAULT_PROMPT_TEMPLATE, "deepseek")).toBe(
      DEFAULT_DEEPSEEK_PROMPT_TEMPLATE,
    );
    expect(migrateLegacyPromptTemplate(PREVIOUS_COMPLETION_PROMPT_TEMPLATE, "deepseek")).toBe(
      DEFAULT_DEEPSEEK_PROMPT_TEMPLATE,
    );
    expect(migrateLegacyPromptTemplate(DEFAULT_PROMPT_TEMPLATE, "deepseek")).toBe(
      DEFAULT_DEEPSEEK_PROMPT_TEMPLATE,
    );
  });

  it("preserves llama.cpp defaults and custom templates", () => {
    expect(migrateLegacyPromptTemplate(DEFAULT_PROMPT_TEMPLATE, "llamacpp")).toBe(
      DEFAULT_PROMPT_TEMPLATE,
    );
    expect(migrateLegacyPromptTemplate("Custom {{question}}", "deepseek")).toBe(
      "Custom {{question}}",
    );
    expect(migrateLegacyPromptTemplate(undefined, "deepseek")).toBe(
      DEFAULT_DEEPSEEK_PROMPT_TEMPLATE,
    );
  });
});
