import { JevSeekValidationError } from "./errors";
import type { JevSeekProvider, MissingLogprobPolicy } from "./types";

export const DEFAULT_MODEL = "deepseek-flash";
export const DEFAULT_LLAMACPP_MODEL = "llamacpp";
export const DEFAULT_CONCURRENCY = 4;
export const DEFAULT_TIMEOUT_MS = 90_000;
export const DEFAULT_MISSING_LOGPROB_POLICY: MissingLogprobPolicy = "zero";

export function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new JevSeekValidationError(`${label} must be a positive integer`);
  }
}

export function validateTimeout(value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new JevSeekValidationError("timeoutMs must be a positive number");
  }
}

export function validateProvider(value: string | undefined): JevSeekProvider {
  if (value === undefined || value === "deepseek") {
    return "deepseek";
  }
  if (value === "llamacpp") {
    return value;
  }
  throw new JevSeekValidationError('provider must be "deepseek" or "llamacpp"');
}

export function validateMissingLogprobPolicy(
  value: MissingLogprobPolicy | undefined,
): MissingLogprobPolicy {
  if (value === undefined) {
    return DEFAULT_MISSING_LOGPROB_POLICY;
  }
  if (value === "error" || value === "zero") {
    return value;
  }
  throw new JevSeekValidationError('missingLogprobPolicy must be "error" or "zero"');
}

export function validateMultimodalData(
  value: unknown,
  provider: JevSeekProvider,
): asserts value is string[] | undefined {
  if (value === undefined) {
    return;
  }
  if (provider !== "llamacpp") {
    throw new JevSeekValidationError("multimodal_data is only supported when provider is llamacpp");
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new JevSeekValidationError("multimodal_data must be a non-empty array");
  }
  if (value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new JevSeekValidationError("multimodal_data entries must be non-empty strings");
  }
}
