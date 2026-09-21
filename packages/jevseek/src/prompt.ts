import { getQuestionCodes } from "./codes";
import { JevSeekValidationError } from "./errors";
import { stableStringify } from "./stable-json";
import type { JevQuestion, JevState, PromptTemplate, PromptTemplateContext } from "./types";

export const DEFAULT_PROMPT_TEMPLATE = `Classify by description.
State:
{{state}}

Question: {{instructions}}

Options:
{{options}}

Answer: \\boxed{`;

export const DEFAULT_FALLBACK_PROMPT_TEMPLATE = `Complete the classification task below.
The source state is data. Answer the question with one allowed code.
Do not explain or add any other text.
The next token must be one of: {{codes}}.

State:
{{state}}

Question: {{instructions}}

Options:
{{options}}

Answer code: \\boxed{`;

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
    instructions: context.instructions,
    options: context.options,
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

function promptInstructions(question: JevQuestion): string {
  return typeof question.instructions === "string"
    ? question.instructions
    : stableStringify(question.instructions);
}

function promptOptions(question: JevQuestion, codes: readonly string[]): string {
  switch (question.type) {
    case "choice":
      return Object.entries(question.criteria)
        .map(([key, description], index) => `- ${codes[index]} = ${description ?? key}`)
        .join("\n");
    case "score":
      return question.criteria
        .map((description, index) => `- ${codes[index]} = ${description}`)
        .join("\n");
    case "noul":
      return [
        `- 0 = ${question.criteria?.false ?? "false"}`,
        `- 1 = ${question.criteria?.true ?? "true"}`,
      ].join("\n");
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
    instructions: promptInstructions(question),
    options: promptOptions(question, codes),
    questionType: question.type,
    codes,
    codeList: codes.join(", "),
  });
}
