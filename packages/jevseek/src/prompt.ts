import { getQuestionCodes } from "./codes";
import { JevSeekValidationError } from "./errors";
import { stableStringify } from "./stable-json";
import type { JevQuestion, JevState, PromptTemplate, PromptTemplateContext } from "./types";

export const DEFAULT_PROMPT_TEMPLATE = `You are a deterministic classifier.
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
Answer code:`;

const PLACEHOLDER_PATTERN = /\{\{\s*(\w+)\s*\}\}/gu;

export function renderPromptTemplate(
  template: PromptTemplate,
  context: PromptTemplateContext,
): string {
  if (typeof template !== "string" && typeof template !== "function") {
    throw new JevSeekValidationError("promptTemplate must be a string or function");
  }

  const values: Record<string, string> = {
    state: context.state,
    question: context.question,
    questionType: context.questionType,
    codes: context.codeList,
  };
  const prompt =
    typeof template === "function"
      ? template(context)
      : template.replace(
          PLACEHOLDER_PATTERN,
          (placeholder, key: string) => values[key] ?? placeholder,
        );

  if (typeof prompt !== "string" || prompt.trim() === "") {
    throw new JevSeekValidationError("promptTemplate must return a non-empty string");
  }
  return prompt;
}

function promptQuestion(question: JevQuestion, codes: readonly string[]): Record<string, unknown> {
  switch (question.type) {
    case "choice": {
      const criteria = Object.fromEntries(
        Object.entries(question.criteria).map(([key, description], index) => [
          codes[index],
          { id: key, description },
        ]),
      );
      return {
        type: question.type,
        instructions: question.instructions,
        criteria,
      };
    }
    case "score":
      return {
        type: question.type,
        instructions: question.instructions,
        criteria: question.criteria.map((description, index) => ({
          code: codes[index],
          description,
        })),
      };
    case "noul":
      return {
        type: question.type,
        instructions: question.instructions,
        criteria: {
          "0": {
            value: false,
            description: question.criteria?.false ?? "false",
          },
          "1": {
            value: true,
            description: question.criteria?.true ?? "true",
          },
        },
      };
  }
}

export function buildPrompt(
  state: JevState,
  question: JevQuestion,
  codes: readonly string[] = getQuestionCodes(question),
  template: PromptTemplate = DEFAULT_PROMPT_TEMPLATE,
): string {
  return renderPromptTemplate(template, {
    state: stableStringify(state),
    question: stableStringify(promptQuestion(question, codes)),
    questionType: question.type,
    codes,
    codeList: codes.join(", "),
  });
}
