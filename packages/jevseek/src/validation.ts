import { JevSeekValidationError } from "./errors";
import { stableStringify } from "./stable-json";
import type { JevQuestion, JevState, QuestionSet } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertInstruction(value: unknown, label: string): void {
  if (
    typeof value !== "string" &&
    !Array.isArray(value) &&
    !isRecord(value)
  ) {
    throw new JevSeekValidationError(`${label} must be a string, object, or array`);
  }

  try {
    stableStringify(value);
  } catch (error) {
    if (error instanceof JevSeekValidationError) {
      throw new JevSeekValidationError(`${label} is not valid JSON: ${error.message}`);
    }
    throw error;
  }
}

export function validateState(state: unknown): asserts state is JevState {
  if (
    typeof state !== "string" &&
    !Array.isArray(state) &&
    !isRecord(state)
  ) {
    throw new JevSeekValidationError("state must be a string, object, or array");
  }

  try {
    stableStringify(state);
  } catch (error) {
    if (error instanceof JevSeekValidationError) {
      throw new JevSeekValidationError(`state is not valid JSON: ${error.message}`);
    }
    throw error;
  }
}

export function validateQuestion(
  question: unknown,
  label = "question",
): asserts question is JevQuestion {
  if (!isRecord(question)) {
    throw new JevSeekValidationError(`${label} must be an object`);
  }

  assertInstruction(question.instructions, `${label}.instructions`);

  switch (question.type) {
    case "choice": {
      if (!isRecord(question.criteria)) {
        throw new JevSeekValidationError(`${label}.criteria must be an object`);
      }

      const entries = Object.entries(question.criteria);
      if (entries.length < 2 || entries.length > 20) {
        throw new JevSeekValidationError(
          `${label}.criteria must contain between 2 and 20 options`,
        );
      }

      for (const [key, description] of entries) {
        if (typeof description !== "string" && description !== null) {
          throw new JevSeekValidationError(
            `${label}.criteria.${key} must be a string or null`,
          );
        }
      }
      break;
    }
    case "score": {
      if (
        !Array.isArray(question.criteria) ||
        question.criteria.length < 2 ||
        question.criteria.length > 10
      ) {
        throw new JevSeekValidationError(
          `${label}.criteria must contain between 2 and 10 levels`,
        );
      }

      question.criteria.forEach((description, index) => {
        if (typeof description !== "string") {
          throw new JevSeekValidationError(
            `${label}.criteria.${index} must be a string`,
          );
        }
      });
      break;
    }
    case "noul": {
      if (question.criteria !== undefined) {
        if (!isRecord(question.criteria)) {
          throw new JevSeekValidationError(`${label}.criteria must be an object`);
        }
        for (const key of ["false", "true"] as const) {
          const description = question.criteria[key];
          if (description !== undefined && typeof description !== "string") {
            throw new JevSeekValidationError(
              `${label}.criteria.${key} must be a string`,
            );
          }
        }
      }
      break;
    }
    default:
      throw new JevSeekValidationError(
        `${label}.type must be "choice", "score", or "noul"`,
      );
  }
}

export function validateQuestions(
  questions: unknown,
): asserts questions is QuestionSet {
  if (!isRecord(questions)) {
    throw new JevSeekValidationError("questions must be an object");
  }

  for (const [questionId, question] of Object.entries(questions)) {
    validateQuestion(question, `questions.${questionId}`);
  }
}
