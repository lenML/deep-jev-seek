export interface OptionSet {
  keys: string[];
  options: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

export function normalizeOptions(value: unknown): OptionSet | null {
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return normalizeOptions(JSON.parse(trimmed) as unknown);
      } catch {
        return null;
      }
    }

    const separator = trimmed.includes("|") ? "|" : trimmed.includes(";") ? ";" : ",";
    const options = trimmed
      .split(separator)
      .map((item) => item.trim())
      .filter(Boolean);
    return options.length > 1 ? { keys: options.map((_, index) => String(index)), options } : null;
  }

  if (Array.isArray(value)) {
    const options = value.flatMap((item) => {
      const text = isRecord(item)
        ? normalizeText(item.description ?? item.label ?? item.value ?? item.text ?? item.name)
        : normalizeText(item);
      return text ? [text] : [];
    });
    return options.length === 0
      ? null
      : { keys: options.map((_, index) => String(index)), options };
  }

  if (isRecord(value)) {
    const entries = Object.entries(value).flatMap(([key, item]) => {
      const text = normalizeText(item) ?? key;
      return [[key, text] as const];
    });
    if (entries.length === 0) {
      return null;
    }
    return {
      keys: entries.map(([key]) => key),
      options: entries.map(([, text]) => text),
    };
  }

  return null;
}

export function resolveAnswerIndex(answer: unknown, optionSet: OptionSet): number | null {
  if (Number.isInteger(answer)) {
    const index = answer as number;
    return index >= 0 && index < optionSet.options.length ? index : null;
  }

  if (typeof answer === "boolean") {
    return answer ? 1 : 0;
  }

  const normalized = normalizeText(answer)?.toLowerCase();
  if (!normalized) {
    return null;
  }

  const keyIndex = optionSet.keys.findIndex((key) => key.toLowerCase() === normalized);
  if (keyIndex >= 0) {
    return keyIndex;
  }

  const optionIndex = optionSet.options.findIndex((option) => option.toLowerCase() === normalized);
  if (optionIndex >= 0) {
    return optionIndex;
  }

  const codeIndex = /^[a-z]$/iu.test(normalized)
    ? normalized.toUpperCase().charCodeAt(0) - 65
    : Number.NaN;
  if (Number.isInteger(codeIndex) && codeIndex >= 0 && codeIndex < optionSet.options.length) {
    return codeIndex;
  }

  if (/^\d+$/u.test(normalized)) {
    const numericIndex = Number(normalized);
    return numericIndex >= 0 && numericIndex < optionSet.options.length ? numericIndex : null;
  }

  return null;
}
