import { DEFAULT_PROMPT_TEMPLATE } from "@lenml/jevseek";
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
  it("replaces prior defaults with the tuned readable template", () => {
    expect(migrateLegacyPromptTemplate(LEGACY_DEFAULT_PROMPT_TEMPLATE)).toBe(
      DEFAULT_PROMPT_TEMPLATE,
    );
    expect(migrateLegacyPromptTemplate(PREVIOUS_COMPLETION_PROMPT_TEMPLATE)).toBe(
      DEFAULT_PROMPT_TEMPLATE,
    );
  });

  it("preserves custom templates and supplies the current default when absent", () => {
    expect(migrateLegacyPromptTemplate("Custom {{question}}")).toBe("Custom {{question}}");
    expect(migrateLegacyPromptTemplate(undefined)).toBe(DEFAULT_PROMPT_TEMPLATE);
  });
});
