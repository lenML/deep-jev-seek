import { getQuestionCodes } from "./codes";
import type {
  ChoiceAnswer,
  ChoiceQuestion,
  JevAnswer,
  JevQuestion,
  NoulAnswer,
  NoulQuestion,
  ScoreAnswer,
  ScoreQuestion,
} from "./types";

export function clampProbability(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function computeConfidence(probabilities: Record<string, number>): number {
  const candidateCount = Object.keys(probabilities).length;
  if (candidateCount <= 1) {
    return 1;
  }

  const maximum = Math.max(...Object.values(probabilities));
  const baseline = 1 / candidateCount;
  return clampProbability((maximum - baseline) / (1 - baseline));
}

export function encodeChoiceAnswer(
  question: ChoiceQuestion,
  probabilities: Record<string, number>,
  codes: readonly string[] = getQuestionCodes(question),
): ChoiceAnswer {
  const keys = Object.keys(question.criteria);
  let bestIndex = 0;

  for (let index = 1; index < keys.length; index += 1) {
    if (
      (probabilities[codes[index] as string] ?? 0) >
      (probabilities[codes[bestIndex] as string] ?? 0)
    ) {
      bestIndex = index;
    }
  }

  return {
    type: "choice",
    choice: keys[bestIndex] as string,
    probabilities: Object.fromEntries(
      keys.map((key, index) => [key, probabilities[codes[index] as string] ?? 0]),
    ),
    confidence: computeConfidence(probabilities),
  };
}

export function encodeScoreAnswer(
  question: ScoreQuestion,
  probabilities: Record<string, number>,
  codes: readonly string[] = getQuestionCodes(question),
): ScoreAnswer {
  const score = codes.reduce((total, code, index) => total + index * (probabilities[code] ?? 0), 0);

  return {
    type: "score",
    score,
    legend: Object.fromEntries(
      question.criteria.map((description, index) => [String(index), description]),
    ),
    probabilities,
    confidence: computeConfidence(probabilities),
  };
}

export function encodeNoulAnswer(
  question: NoulQuestion,
  probabilities: Record<string, number>,
  codes: readonly string[] = getQuestionCodes(question),
): NoulAnswer {
  void question;
  void codes;
  return {
    type: "noul",
    noul: probabilities["1"] ?? 0,
  };
}

export function encodeAnswer(
  question: JevQuestion,
  probabilities: Record<string, number>,
  codes: readonly string[] = getQuestionCodes(question),
): JevAnswer {
  switch (question.type) {
    case "choice":
      return encodeChoiceAnswer(question, probabilities, codes);
    case "score":
      return encodeScoreAnswer(question, probabilities, codes);
    case "noul":
      return encodeNoulAnswer(question, probabilities, codes);
  }
}
