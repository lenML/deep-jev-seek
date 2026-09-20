import { normalizeCandidateToken } from "./codes";
import { JevSeekParseError, JevSeekValidationError } from "./errors";
import type { DeepSeekLogprobs } from "./types";

export const MISSING_CANDIDATE_LOGPROB = -30;

function normalizeCodes(codes: readonly string[]): string[] {
  const normalized = codes.map(normalizeCandidateToken);
  if (normalized.length === 0 || normalized.some((code) => code.length === 0)) {
    throw new JevSeekValidationError("candidate codes must not be empty");
  }
  return [...new Set(normalized)];
}

function setMaximum(
  logprobs: Map<string, number>,
  token: string | null | undefined,
  value: number | null | undefined,
  allowed: Set<string>,
): void {
  const code = normalizeCandidateToken(token);
  if (!allowed.has(code) || typeof value !== "number" || !Number.isFinite(value)) {
    return;
  }
  const current = logprobs.get(code);
  if (current === undefined || value > current) {
    logprobs.set(code, value);
  }
}

export function normalizeCandidateLogprobs(
  candidateCodes: readonly string[],
  logprobs: DeepSeekLogprobs | null | undefined,
  sampledText?: string,
): Record<string, number> {
  const codes = normalizeCodes(candidateCodes);
  const allowed = new Set(codes);

  if (logprobs == null) {
    const sampledCode = normalizeCandidateToken(sampledText);
    if (codes.length === 1 && sampledCode === codes[0]) {
      return { [codes[0] as string]: 1 };
    }
    throw new JevSeekParseError(
      "response did not contain logprobs for any candidate",
    );
  }

  const observed = new Map<string, number>();
  for (const top of logprobs.top_logprobs ?? []) {
    for (const [token, value] of Object.entries(top)) {
      setMaximum(observed, token, value, allowed);
    }
  }

  const sampledToken = logprobs.tokens?.[0] ?? sampledText;
  const sampledLogprob = logprobs.token_logprobs?.[0];

  if (typeof sampledLogprob === "number") {
    setMaximum(observed, sampledToken, sampledLogprob, allowed);
  } else if (observed.size === 0) {
    // Some compatible gateways omit both sampled and top logprobs. A single
    // valid sampled label is still useful, but an absent value must not
    // override real top-logprob data with logprob 0.
    setMaximum(observed, sampledToken, 0, allowed);
  }

  if (observed.size === 0) {
    throw new JevSeekParseError(
      "response did not contain logprobs for any candidate",
    );
  }

  const maximum = Math.max(...observed.values());
  const weights = new Map<string, number>();
  let total = 0;

  for (const code of codes) {
    const logprob = observed.get(code) ?? MISSING_CANDIDATE_LOGPROB;
    const weight = Math.exp(logprob - maximum);
    weights.set(code, weight);
    total += weight;
  }

  if (!Number.isFinite(total) || total <= 0) {
    throw new JevSeekParseError("candidate probability mass is zero");
  }

  return Object.fromEntries(
    codes.map((code) => [code, (weights.get(code) as number) / total]),
  );
}
