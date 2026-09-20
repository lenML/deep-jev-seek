import { getQuestionCodes } from "./codes";
import { stableStringify } from "./stable-json";
import type { JevQuestion, JevState } from "./types";

const SYSTEM_INSTRUCTIONS = `You are a deterministic classifier.
Evaluate the source state against one question.
Return exactly one option code from the allowed codes.
Do not explain, reason, quote, or emit any other text.`;

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
): string {
  return `${SYSTEM_INSTRUCTIONS}

<state>
${stableStringify(state)}
</state>

<question>
${stableStringify(promptQuestion(question, codes))}
</question>

Allowed codes: ${codes.join(", ")}
Answer code:`;
}
