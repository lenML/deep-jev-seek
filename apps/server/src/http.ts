export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "Authorization, Content-Type",
  "access-control-expose-headers": "Content-Length, Content-Type",
  "access-control-max-age": "86400",
} as const;

interface ErrorDetails {
  code?: unknown;
  message?: unknown;
  status?: unknown;
  statusCode?: unknown;
}

export class HttpError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS_HEADERS,
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function errorResponse(error: HttpError): Response {
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

export function methodNotAllowed(allow: string): Response {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
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

export function upstreamError(error: unknown, secrets: string[]): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  const details = isRecord(error) ? (error as ErrorDetails) : {};
  const rawCode = typeof details.code === "string" ? details.code : undefined;
  const rawStatus = typeof details.status === "number" ? details.status : details.statusCode;
  const status = statusForError(rawCode, rawStatus);
  const code = redactSecrets(
    rawCode ?? (status === 502 ? "upstream_error" : "request_failed"),
    secrets,
  );
  const rawMessage =
    typeof details.message === "string" ? details.message : "Upstream request failed.";
  const message = redactSecrets(rawMessage, secrets);

  return new HttpError(status, code, message);
}
