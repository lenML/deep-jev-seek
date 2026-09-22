import { createJevSeek, type JevSeekProvider } from "@lenml/jevseek";

import {
  getApiKey,
  readMaxBodyBytes,
  readPort,
  readProvider,
  resolveBaseUrl,
  resolveModel,
  type Environment,
} from "./config";
import {
  CORS_HEADERS,
  HttpError,
  errorResponse,
  isRecord,
  jsonResponse,
  methodNotAllowed,
  readJsonBody,
  upstreamError,
} from "./http";
import { listModels } from "./models";

type JevSeekClient = ReturnType<typeof createJevSeek>;
type ClientFactory = (options: {
  apiKey?: string;
  model: string;
  provider: JevSeekProvider;
  baseUrl: string;
}) => JevSeekClient;

export interface AppOptions {
  clientFactory?: ClientFactory;
  env?: Environment;
}

function readMultimodalData(value: unknown, provider: JevSeekProvider): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (provider !== "llamacpp") {
    throw new HttpError(
      400,
      "multimodal_not_supported",
      "multimodal_data is only supported in llamacpp mode.",
    );
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new HttpError(
      400,
      "invalid_multimodal_data",
      "multimodal_data must be a non-empty array.",
    );
  }
  if (value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new HttpError(
      400,
      "invalid_multimodal_data",
      "multimodal_data entries must be non-empty strings.",
    );
  }
  return value;
}

async function handleSystemOne(
  request: Request,
  env: Environment,
  provider: JevSeekProvider,
  baseUrl: string,
  clientFactory: ClientFactory,
): Promise<Response> {
  const secrets: string[] = [];

  try {
    const apiKey = getApiKey(request, env, provider, provider === "deepseek");
    if (apiKey) {
      secrets.push(apiKey);
    }

    const parsed = await readJsonBody(request, readMaxBodyBytes(env.MAX_BODY_BYTES));
    if (!isRecord(parsed)) {
      throw new HttpError(400, "invalid_request", "Request body must be a JSON object.");
    }

    const model = resolveModel(parsed.model, env, provider);
    if (parsed.promptTemplate !== undefined && typeof parsed.promptTemplate !== "string") {
      throw new HttpError(400, "invalid_prompt_template", "promptTemplate must be a string.");
    }
    if (
      parsed.fallbackPromptTemplate !== undefined &&
      typeof parsed.fallbackPromptTemplate !== "string"
    ) {
      throw new HttpError(
        400,
        "invalid_fallback_prompt_template",
        "fallbackPromptTemplate must be a string.",
      );
    }
    if (
      parsed.missingLogprobPolicy !== undefined &&
      parsed.missingLogprobPolicy !== "error" &&
      parsed.missingLogprobPolicy !== "zero"
    ) {
      throw new HttpError(
        400,
        "invalid_missing_logprob_policy",
        'missingLogprobPolicy must be "error" or "zero".',
      );
    }
    const multimodalData = readMultimodalData(parsed.multimodal_data, provider);
    const client = clientFactory({ apiKey, model, provider, baseUrl });
    const input = {
      state: parsed.state,
      questions: parsed.questions,
      model,
      ...(typeof parsed.debug === "boolean" ? { debug: parsed.debug } : {}),
      ...(typeof parsed.promptTemplate === "string"
        ? { promptTemplate: parsed.promptTemplate }
        : {}),
      ...(typeof parsed.fallbackPromptTemplate === "string"
        ? { fallbackPromptTemplate: parsed.fallbackPromptTemplate }
        : {}),
      ...(parsed.missingLogprobPolicy === "error" || parsed.missingLogprobPolicy === "zero"
        ? { missingLogprobPolicy: parsed.missingLogprobPolicy }
        : {}),
      ...(multimodalData === undefined ? {} : { multimodal_data: multimodalData }),
    } as Parameters<JevSeekClient["systemOne"]>[0];
    const result = await client.systemOne(input);

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(upstreamError(error, secrets));
  }
}

export function createApp(options: AppOptions = {}) {
  const env = options.env ?? process.env;
  const provider = readProvider(env);
  const baseUrl = resolveBaseUrl(env, provider);
  const clientFactory = options.clientFactory ?? createJevSeek;

  const fetch = async (request: Request): Promise<Response> => {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const pathname = new URL(request.url).pathname;

    try {
      if (pathname === "/") {
        if (request.method !== "GET") {
          return methodNotAllowed("GET");
        }

        return jsonResponse({
          name: "@lenml/jevseek-server",
          version: "0.1.1",
          provider,
          endpoints: ["/healthz", "/v1/models", "/v1/systemone"],
        });
      }

      if (pathname === "/healthz") {
        if (request.method !== "GET") {
          return methodNotAllowed("GET");
        }

        return jsonResponse({ status: "ok", service: "jevseek-server", provider });
      }

      if (pathname === "/v1/models") {
        if (request.method !== "GET") {
          return methodNotAllowed("GET");
        }

        return listModels(env, provider);
      }

      if (pathname === "/v1/systemone") {
        if (request.method !== "POST") {
          return methodNotAllowed("POST");
        }

        return handleSystemOne(request, env, provider, baseUrl, clientFactory);
      }

      return jsonResponse(
        {
          error: {
            code: "not_found",
            message: "Route not found.",
            type: "invalid_request_error",
          },
        },
        404,
      );
    } catch (error) {
      return errorResponse(upstreamError(error, []));
    }
  };

  return { fetch };
}

export interface StartServerOptions extends AppOptions {
  onListening?: (server: Bun.Server<undefined>) => void;
}

export function startServer(options: StartServerOptions = {}) {
  const env = options.env ?? process.env;
  const hostname = env.HOST?.trim() || "0.0.0.0";
  const port = readPort(env.PORT);
  const app = createApp(options);
  const server = Bun.serve({
    hostname,
    port,
    fetch: app.fetch,
  });

  let stopping = false;
  const stop = async (signal: NodeJS.Signals) => {
    if (stopping) {
      return;
    }

    stopping = true;
    console.info(`[jevseek-server] received ${signal}, stopping`);
    await server.stop(true);
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  };

  const onSigint = () => void stop("SIGINT");
  const onSigterm = () => void stop("SIGTERM");
  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);

  options.onListening?.(server);
  if (!options.onListening) {
    console.info(`[jevseek-server] listening on http://${hostname}:${server.port}`);
  }

  return { server, stop };
}
