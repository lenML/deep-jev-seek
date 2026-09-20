import { createJevSeek } from "@lenml/jevseek";

const DEFAULT_MODEL = "deepseek-flash";
const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;
const DEFAULT_PORT = 8787;
const MODEL_ALIASES = new Set(["jev-latest", "jev-preview"]);
const KNOWN_MODELS = ["deepseek-flash", "deepseek-v4-pro"] as const;

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Authorization, Content-Type",
  "access-control-expose-headers": "Content-Length, Content-Type",
  "access-control-max-age": "86400",
} as const;

type Environment = Record<string, string | undefined>;
type JevSeekClient = ReturnType<typeof createJevSeek>;
type ClientFactory = (options: { apiKey: string; model: string }) => JevSeekClient;

export interface AppOptions {
  clientFactory?: ClientFactory;
  env?: Environment;
}

interface ErrorDetails {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
}

class HttpError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

function errorResponse(error: HttpError): Response {
  return jsonResponse(
    {
      error: {
        code: error.code,
        message: error.message,
        type: error.status >= 500 ? "server_error" : "invalid_request_error",
      },
    },
    error.status,
  );
}

function methodNotAllowed(allow: string): Response {
  return jsonResponse(
    {
      error: {
        code: "method_not_allowed",
        message: `Method not allowed. Use ${allow}.`,
        type: "invalid_request_error",
      },
    },
    405,
    { allow },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readPositiveInteger(value: string | undefined, fallback: number): number {
  if (!value?.trim()) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readPort(value: string | undefined): number {
  const port = readPositiveInteger(value, DEFAULT_PORT);
  return port <= 65535 ? port : DEFAULT_PORT;
}

function readMaxBodyBytes(value: string | undefined): number {
  return readPositiveInteger(value, DEFAULT_MAX_BODY_BYTES);
}

function resolveModel(requestedModel: unknown, env: Environment): string {
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

function getApiKey(request: Request, env: Environment): string {
  const authorization = request.headers.get("authorization")?.trim();

  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization);
    const token = match?.[1]?.trim();
    if (!token) {
      throw new HttpError(401, "invalid_authorization", "Authorization must use Bearer credentials.");
    }
    return token;
  }

  const envKey = env.DEEPSEEK_API_KEY?.trim();
  if (!envKey) {
    throw new HttpError(401, "missing_api_key", "Provide an Authorization Bearer token or DEEPSEEK_API_KEY.");
  }

  return envKey;
}

async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const contentType = request.headers.get("content-type");
  const mediaType = contentType?.split(";", 1)[0]?.trim().toLowerCase();

  if (mediaType && mediaType !== "application/json" && !mediaType.endsWith("+json")) {
    throw new HttpError(415, "unsupported_media_type", "Content-Type must be application/json.");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpError(413, "payload_too_large", `Request body exceeds ${maxBytes} bytes.`);
  }

  if (!request.body) {
    throw new HttpError(400, "invalid_json", "Request body must contain JSON.");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "payload_too_large", `Request body exceeds ${maxBytes} bytes.`);
      }

      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(400, "invalid_body", "Unable to read request body.");
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let body: string;
  try {
    body = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be valid UTF-8 JSON.");
  }

  if (!body.trim()) {
    throw new HttpError(400, "invalid_json", "Request body must contain JSON.");
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

function redactSecrets(message: string, secrets: string[]): string {
  let redacted = message.replace(/Bearer\s+[^\s,;]+/gi, "Bearer [REDACTED]");

  for (const secret of secrets) {
    if (secret) {
      redacted = redacted.split(secret).join("[REDACTED]");
    }
  }

  return redacted;
}

function statusForError(code: unknown, rawStatus: unknown): number {
  if (typeof rawStatus === "number" && rawStatus >= 400 && rawStatus <= 599) {
    return rawStatus;
  }

  switch (code) {
    case "VALIDATION_ERROR":
    case "REQUEST_ERROR":
      return 400;
    case "AUTHENTICATION_ERROR":
      return 401;
    case "ABORT_ERROR":
      return 408;
    case "TIMEOUT_ERROR":
      return 504;
    case "RATE_LIMIT_ERROR":
      return 429;
    default:
      return 502;
  }
}

function upstreamError(error: unknown, secrets: string[]): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const details = isRecord(error) ? (error as ErrorDetails) : {};
  const rawCode = typeof details.code === "string" ? details.code : undefined;
  const rawStatus = typeof details.status === "number" ? details.status : details.statusCode;
  const status = statusForError(rawCode, rawStatus);
  const code = redactSecrets(rawCode ?? (status === 502 ? "upstream_error" : "request_failed"), secrets);
  const rawMessage = typeof details.message === "string" ? details.message : "Upstream request failed.";
  const message = redactSecrets(rawMessage, secrets);

  return new HttpError(status, code, message);
}

async function handleSystemOne(
  request: Request,
  env: Environment,
  clientFactory: ClientFactory,
): Promise<Response> {
  const secrets: string[] = [];

  try {
    const apiKey = getApiKey(request, env);
    secrets.push(apiKey);

    const parsed = await readJsonBody(request, readMaxBodyBytes(env.MAX_BODY_BYTES));
    if (!isRecord(parsed)) {
      throw new HttpError(400, "invalid_request", "Request body must be a JSON object.");
    }

    const model = resolveModel(parsed.model, env);
    const client = clientFactory({ apiKey, model });
    const input = {
      state: parsed.state,
      questions: parsed.questions,
      model,
      ...(typeof parsed.debug === "boolean" ? { debug: parsed.debug } : {}),
    } as Parameters<JevSeekClient["systemOne"]>[0];
    const result = await client.systemOne(input);

    return jsonResponse(result);
  } catch (error) {
    return errorResponse(upstreamError(error, secrets));
  }
}

function listModels(env: Environment): Response {
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

export function createApp(options: AppOptions = {}) {
  const env = options.env ?? process.env;
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
          version: "0.1.0",
          endpoints: ["/healthz", "/v1/models", "/v1/systemone"],
        });
      }

      if (pathname === "/healthz") {
        if (request.method !== "GET") {
          return methodNotAllowed("GET");
        }

        return jsonResponse({ status: "ok", service: "jevseek-server" });
      }

      if (pathname === "/v1/models") {
        if (request.method !== "GET") {
          return methodNotAllowed("GET");
        }

        return listModels(env);
      }

      if (pathname === "/v1/systemone") {
        if (request.method !== "POST") {
          return methodNotAllowed("POST");
        }

        return handleSystemOne(request, env, clientFactory);
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
