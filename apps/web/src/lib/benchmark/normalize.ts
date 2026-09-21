import { indexToChoiceCode, type ChoiceQuestion } from "@lenml/jevseek";

import { normalizeOptions, resolveAnswerIndex, type OptionSet } from "./options";
import type { BenchmarkRow, BenchmarkSource } from "./types";

interface ParsedJevQuestion {
  type: string;
  instructions: unknown;
  criteria?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringify(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  if (value === undefined || value === null) {
    return fallback;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function normalizeText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function choiceQuestion(instructions: string, options: string[]): ChoiceQuestion {
  return {
    type: "choice",
    instructions,
    criteria: Object.fromEntries(
      options.map((option, index) => [indexToChoiceCode(index), option]),
    ),
  };
}

function idValue(record: Record<string, unknown>, source: BenchmarkSource, index: number): string {
  return (
    normalizeText(record.id ?? record.question_id ?? record.uid ?? record.key) ??
    `${source.id}-${index + 1}`
  );
}

function categoryValue(record: Record<string, unknown>, source: BenchmarkSource): string {
  return (
    normalizeText(record.family ?? record.category ?? record.group ?? record.subject) ?? source.name
  );
}

function sourceValue(record: Record<string, unknown>, source: BenchmarkSource): string {
  const provenance = isRecord(record.provenance) ? record.provenance : null;
  return normalizeText(provenance?.source ?? record.src ?? record.source) ?? source.name;
}

function buildRow(
  record: Record<string, unknown>,
  source: BenchmarkSource,
  index: number,
  options: string[],
  answerIndex: number,
  instructions: string,
): BenchmarkRow | null {
  if (options.length === 0 || options.length > 26 || answerIndex < 0) {
    return null;
  }

  const id = idValue(record, source, index);
  return {
    key: `${source.id}:${id}:${index}`,
    id,
    state:
      record.state ?? record.context ?? (source.id === "mmlu-pro" ? { dataset: source.name } : ""),
    question: instructions,
    instructions: choiceQuestion(instructions, options),
    options,
    answer: indexToChoiceCode(answerIndex),
    answerIndex,
    category: categoryValue(record, source),
    src: sourceValue(record, source),
  };
}

function isJevQuestion(value: unknown): value is ParsedJevQuestion {
  return isRecord(value) && typeof value.type === "string" && "instructions" in value;
}

function normalizeJevRecord(
  record: Record<string, unknown>,
  source: BenchmarkSource,
  index: number,
): BenchmarkRow | null {
  if (!isJevQuestion(record.question)) {
    return null;
  }

  const expected = record.expected ?? record.answer ?? record.label ?? record.target;
  const instructions = stringify(record.question.instructions, "Question");
  const optionSet = normalizeOptions(record.question.criteria);

  if (record.question.type === "noul") {
    const criteria = isRecord(record.question.criteria) ? record.question.criteria : {};
    const noulOptions: OptionSet = {
      keys: ["false", "true"],
      options: [normalizeText(criteria.false) ?? "False", normalizeText(criteria.true) ?? "True"],
    };
    const normalizedAnswer = normalizeText(expected)?.toLowerCase();
    const answerIndex =
      normalizedAnswer === "yes" || normalizedAnswer === "true" || normalizedAnswer === "1"
        ? 1
        : normalizedAnswer === "no" || normalizedAnswer === "false" || normalizedAnswer === "0"
          ? 0
          : resolveAnswerIndex(expected, noulOptions);
    return answerIndex === null
      ? null
      : buildRow(record, source, index, noulOptions.options, answerIndex, instructions);
  }

  if (!optionSet) {
    return null;
  }
  const answerIndex = resolveAnswerIndex(expected, optionSet);
  return answerIndex === null
    ? null
    : buildRow(record, source, index, optionSet.options, answerIndex, instructions);
}

export function normalizeBenchmarkRecord(
  value: unknown,
  source: BenchmarkSource,
  index: number,
): BenchmarkRow | null {
  if (!isRecord(value)) {
    return null;
  }

  const jevRow = normalizeJevRecord(value, source, index);
  if (jevRow) {
    return jevRow;
  }

  const optionSet = normalizeOptions(
    value.options ?? value.choices ?? value.labels ?? value.criteria,
  );
  if (!optionSet) {
    return null;
  }

  const answerIndex = Number.isInteger(value.answer_index)
    ? resolveAnswerIndex(value.answer_index, optionSet)
    : resolveAnswerIndex(value.expected ?? value.answer ?? value.label ?? value.target, optionSet);
  if (answerIndex === null) {
    return null;
  }

  const question = stringify(
    value.question ?? value.prompt ?? value.instructions ?? value.input,
    "Question",
  );
  return buildRow(value, source, index, optionSet.options, answerIndex, question);
}
