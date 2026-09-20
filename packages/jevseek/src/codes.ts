import { JevSeekValidationError } from "./errors";
import type { JevQuestion } from "./types";

export function indexToChoiceCode(index: number): string {
  if (!Number.isInteger(index) || index < 0 || index > 25) {
    throw new JevSeekValidationError(`choice code index out of range: ${index}`);
  }
  return String.fromCharCode(65 + index);
}

export function getQuestionCodes(question: JevQuestion): string[] {
  switch (question.type) {
    case "choice":
      return Object.keys(question.criteria).map((_, index) => indexToChoiceCode(index));
    case "score":
      return question.criteria.map((_, index) => String(index));
    case "noul":
      return ["0", "1"];
  }
}

export function normalizeCandidateToken(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}
