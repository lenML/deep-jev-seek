import type { JevSeekProvider } from "@lenml/jevseek";

import { HttpError } from "./http";

export const DEFAULT_MODEL = "deepseek-flash";
export const DEFAULT_LLAMACPP_MODEL = "llamacpp";
export const DEFAULT_DEEPSEEK_BASE_URL = "https://api.deepseek.com/beta";
export const DEFAULT_LLAMACPP_BASE_URL = "http://127.0.0.1:8080/v1";
export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
export const DEFAULT_PORT = 8787;
export const MODEL_ALIASES = new Set(["jev-latest", "jev-preview"]);
export const KNOWN_MODELS = ["deepseek-flash", "deepseek-v4-pro"] as const;

export type Environment = Record<string, string | undefined>;

export function readProvider(env: Environment): JevSeekProvider {
  const provider = env.JEVSEEK_PROVIDER?.trim().toLowerCase() || "deepseek";
  if (provider === "deepseek" || provider === "llamacpp") {
    return provider;
  }
  throw new Error('JEVSEEK_PROVIDER must be "deepseek" or "llamacpp"');
}

export function resolveBaseUrl(env: Environment, provider: JevSeekProvider): string {
  return provider === "llamacpp"
    ? env.LLAMACPP_BASE_URL?.trim() || DEFAULT_LLAMACPP_BASE_URL
    : env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_DEEPSEEK_BASE_URL;
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function readPort(value: string | undefined): number {
  const port = readPositiveInteger(value, DEFAULT_PORT);
  return port <= 65535 ? port : DEFAULT_PORT;
}

export function readMaxBodyBytes(value: string | undefined): number {
  return readPositiveInteger(value, DEFAULT_MAX_BODY_BYTES);
}

export function resolveModel(
  requestedModel: unknown,
  env: Environment,
  provider: JevSeekProvider,
): string {
  const defaultModel =
    provider === "llamacpp"
      ? env.LLAMACPP_MODEL?.trim() || DEFAULT_LLAMACPP_MODEL
      : env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL;

  if (requestedModel === undefined || requestedModel === null || requestedModel === "") {
    return defaultModel;
  }

  if (typeof requestedModel !== "string") {
    throw new HttpError(400, "invalid_model", "model must be a string.");
  }

  const model = requestedModel.trim();
  if (!model) {
    throw new HttpError(400, "invalid_model", "model must not be empty.");
  }

  return MODEL_ALIASES.has(model) ? defaultModel : model;
}

export function getApiKey(
  request: Request,
  env: Environment,
  provider: JevSeekProvider,
  required: boolean,
): string | undefined {
  const authorization = request.headers.get("authorization")?.trim();

  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    const token = match?.[1]?.trim();
    if (!token) {
      throw new HttpError(
        401,
        "invalid_authorization",
        "Authorization must use Bearer credentials.",
      );
    }
    return token;
  }

  const envKey =
    (provider === "llamacpp" ? env.LLAMACPP_API_KEY : env.DEEPSEEK_API_KEY)?.trim() || undefined;
  if (envKey || !required) {
    return envKey;
  }

  throw new HttpError(
    401,
    "missing_api_key",
    "Provide an Authorization Bearer token or the configured API key.",
  );
}
