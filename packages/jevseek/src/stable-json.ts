import { JevSeekValidationError } from "./errors";

function serialize(value: unknown, stack: object[]): string | undefined {
  if (value === null) {
    return "null";
  }

  switch (typeof value) {
    case "string":
      return JSON.stringify(value);
    case "boolean":
      return value ? "true" : "false";
    case "number":
      return Number.isFinite(value) ? String(value) : "null";
    case "undefined":
    case "function":
    case "symbol":
      return undefined;
    case "bigint":
      throw new JevSeekValidationError("JSON values cannot contain bigint");
  }

  if (stack.includes(value)) {
    throw new JevSeekValidationError("JSON values cannot contain circular references");
  }

  const toJSON = (value as { toJSON?: () => unknown }).toJSON;
  if (typeof toJSON === "function") {
    return serialize(toJSON.call(value), stack);
  }

  stack.push(value);

  try {
    if (Array.isArray(value)) {
      const items = value.map((item) => serialize(item, stack) ?? "null");
      return `[${items.join(",")}]`;
    }

    const entries: string[] = [];
    for (const key of Object.keys(value).sort()) {
      const serialized = serialize((value as Record<string, unknown>)[key], stack);
      if (serialized !== undefined) {
        entries.push(`${JSON.stringify(key)}:${serialized}`);
      }
    }
    return `{${entries.join(",")}}`;
  } finally {
    stack.pop();
  }
}

export function stableStringify(value: unknown): string {
  const serialized = serialize(value, []);
  if (serialized === undefined) {
    throw new JevSeekValidationError("top-level JSON value must be serializable");
  }
  return serialized;
}
