import {
  JevSeekAbortError,
  JevSeekError,
  JevSeekParseError,
  JevSeekRateLimitError,
  JevSeekValidationError,
} from "./errors";
import type { RetryOptions } from "./types";

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 300,
  maxDelayMs: 5_000,
  jitter: true,
};

export function resolveRetryOptions(options: Partial<RetryOptions> | undefined): RetryOptions {
  const resolved = { ...DEFAULT_RETRY_OPTIONS, ...options };
  if (!Number.isInteger(resolved.maxAttempts) || resolved.maxAttempts < 1) {
    throw new JevSeekValidationError("retry.maxAttempts must be a positive integer");
  }
  if (!Number.isFinite(resolved.baseDelayMs) || resolved.baseDelayMs < 0) {
    throw new JevSeekValidationError("retry.baseDelayMs must be non-negative");
  }
  if (!Number.isFinite(resolved.maxDelayMs) || resolved.maxDelayMs < 0) {
    throw new JevSeekValidationError("retry.maxDelayMs must be non-negative");
  }
  return resolved;
}

export function parseRetryAfter(
  value: string | null | undefined,
  nowMs = Date.now(),
): number | undefined {
  if (value == null || value.trim() === "") {
    return undefined;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds)) {
    return Math.max(0, seconds * 1_000);
  }

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  return Math.max(0, timestamp - nowMs);
}

function backoffDelay(attempt: number, options: RetryOptions): number {
  const exponential = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** (attempt - 1));
  if (!options.jitter || exponential === 0) {
    return exponential;
  }
  return Math.min(options.maxDelayMs, exponential * (0.5 + Math.random()));
}

function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (milliseconds <= 0) {
    return signal?.aborted ? Promise.reject(new JevSeekAbortError()) : Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new JevSeekAbortError());
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);

    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new JevSeekAbortError(undefined, signal?.reason));
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export interface RetryResult<T> {
  value: T;
  attempts: number;
}

export async function withRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions,
  signal?: AbortSignal,
): Promise<RetryResult<T>> {
  let parseAttempts = 0;

  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    if (signal?.aborted) {
      throw new JevSeekAbortError();
    }

    try {
      return { value: await operation(attempt), attempts: attempt };
    } catch (error) {
      if (signal?.aborted) {
        throw new JevSeekAbortError(undefined, signal.reason);
      }

      const retryable = error instanceof JevSeekError && error.retryable;
      if (!retryable) {
        throw error;
      }

      if (error instanceof JevSeekParseError) {
        parseAttempts += 1;
        if (parseAttempts >= 2) {
          throw error;
        }
      }

      if (attempt >= options.maxAttempts) {
        throw error;
      }

      const retryAfter = error instanceof JevSeekRateLimitError ? error.retryAfterMs : undefined;
      const delay = retryAfter ?? backoffDelay(attempt, options);
      await sleep(delay, signal);
    }
  }

  throw new JevSeekError("retry loop terminated unexpectedly");
}
