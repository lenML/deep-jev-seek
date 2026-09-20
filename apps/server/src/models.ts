import { DEFAULT_MODEL, KNOWN_MODELS, MODEL_ALIASES, type Environment } from "./config";
import { jsonResponse } from "./http";

export function listModels(env: Environment): Response {
  const defaultModel = env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL;
  const ids = [...MODEL_ALIASES, defaultModel, ...KNOWN_MODELS].filter(
    (model, index, all) => all.indexOf(model) === index,
  );

  return jsonResponse({
    object: "list",
    data: ids.map((id) => ({
      id,
      object: "model",
      created: 0,
      owned_by: "lenml",
    })),
  });
}
