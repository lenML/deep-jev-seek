import type { JevSeekProvider } from "@lenml/jevseek";

import {
  DEFAULT_MODEL,
  KNOWN_MODELS,
  MODEL_ALIASES,
  resolveModel,
  type Environment,
} from "./config";
import { jsonResponse } from "./http";

export function listModels(env: Environment, provider: JevSeekProvider): Response {
  const defaultModel = resolveModel(undefined, env, provider);
  const ids = (
    provider === "llamacpp"
      ? [...MODEL_ALIASES, defaultModel]
      : [...MODEL_ALIASES, defaultModel, ...KNOWN_MODELS, DEFAULT_MODEL]
  ).filter((model, index, all) => all.indexOf(model) === index);

  return jsonResponse({
    object: "list",
    data: ids.map((id) => ({
      id,
      object: "model",
      created: 0,
      owned_by: provider === "llamacpp" ? "llamacpp" : "lenml",
    })),
  });
}
