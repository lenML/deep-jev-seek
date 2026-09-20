export interface ParsedMultimodalData {
  data?: string[];
  invalid?: boolean;
}

export function parseMultimodalData(value: string): ParsedMultimodalData {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { invalid: true };
    }
    if (parsed.some((item) => typeof item !== "string" || item.trim() === "")) {
      return { invalid: true };
    }
    return { data: parsed };
  } catch {
    return { invalid: true };
  }
}
