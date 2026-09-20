import { HttpError } from "./http";

export const DEFAULT_MODEL = "deepseek-flash";
export const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
export const DEFAULT_PORT = 8787;
export const MODEL_ALIASES = new Set(["jev-latest", "jev-preview"]);
export const KNOWN_MODELS = ["deepseek-flash", "deepseek-v4-pro"] as const;

export type Environment = Record<string, string | undefined>;

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

export function resolveModel(requestedModel: unknown, env: Environment): string {
  const defaultModel = env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL;

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

export function getApiKey(request: Request, env: Environment): string {
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

  const envKey = env.DEEPSEEK_API_KEY?.trim();
  if (!envKey) {
    throw new HttpError(
      401,
      "missing_api_key",
      "Provide an Authorization Bearer token or DEEPSEEK_API_KEY.",
    );
  }

  return envKey;
}
