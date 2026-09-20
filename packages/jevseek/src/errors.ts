export type JevSeekErrorCode =
  | "VALIDATION_ERROR"
  | "REQUEST_ERROR"
  | "AUTHENTICATION_ERROR"
  | "RATE_LIMIT_ERROR"
  | "SERVER_ERROR"
  | "HTTP_ERROR"
  | "NETWORK_ERROR"
  | "TIMEOUT_ERROR"
  | "ABORT_ERROR"
  | "PARSE_ERROR";

export interface JevSeekErrorOptions {
  code?: JevSeekErrorCode;
  retryable?: boolean;
  status?: number;
  requestId?: string;
  responseBody?: unknown;
  cause?: unknown;
}

export class JevSeekError extends Error {
  readonly code: JevSeekErrorCode;
  readonly retryable: boolean;
  readonly status?: number;
  readonly requestId?: string;
  readonly responseBody?: unknown;

  constructor(message: string, options: JevSeekErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code ?? "HTTP_ERROR";
    this.retryable = options.retryable ?? false;
    this.status = options.status;
    this.requestId = options.requestId;
    this.responseBody = options.responseBody;
  }
}

export class JevSeekValidationError extends JevSeekError {
  constructor(message: string, options: Omit<JevSeekErrorOptions, "code"> = {}) {
    super(message, { ...options, code: "VALIDATION_ERROR", retryable: false });
  }
}

export class JevSeekRequestError extends JevSeekError {
  constructor(message: string, options: Omit<JevSeekErrorOptions, "code"> = {}) {
    super(message, { ...options, code: "REQUEST_ERROR", retryable: false });
  }
}

export class JevSeekAuthenticationError extends JevSeekError {
  constructor(message: string, options: Omit<JevSeekErrorOptions, "code"> = {}) {
    super(message, {
      ...options,
      code: "AUTHENTICATION_ERROR",
      retryable: false,
    });
  }
}

export class JevSeekRateLimitError extends JevSeekError {
  readonly retryAfterMs?: number;

  constructor(
    message: string,
    options: Omit<JevSeekErrorOptions, "code" | "retryable"> & {
      retryAfterMs?: number;
    } = {},
  ) {
    super(message, { ...options, code: "RATE_LIMIT_ERROR", retryable: true });
    this.retryAfterMs = options.retryAfterMs;
  }
}

export class JevSeekServerError extends JevSeekError {
  constructor(message: string, options: Omit<JevSeekErrorOptions, "code"> = {}) {
    super(message, { ...options, code: "SERVER_ERROR", retryable: true });
  }
}

export class JevSeekHttpError extends JevSeekError {
  constructor(message: string, options: JevSeekErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? "HTTP_ERROR" });
  }
}

export class JevSeekNetworkError extends JevSeekError {
  constructor(message = "DeepSeek network request failed", cause?: unknown) {
    super(message, { code: "NETWORK_ERROR", retryable: true, cause });
  }
}

export class JevSeekTimeoutError extends JevSeekError {
  constructor(message = "DeepSeek request timed out", cause?: unknown) {
    super(message, { code: "TIMEOUT_ERROR", retryable: true, cause });
  }
}

export class JevSeekAbortError extends JevSeekError {
  constructor(message = "DeepSeek request aborted", cause?: unknown) {
    super(message, { code: "ABORT_ERROR", retryable: false, cause });
  }
}

export class JevSeekParseError extends JevSeekError {
  constructor(message: string, options: Omit<JevSeekErrorOptions, "code" | "retryable"> = {}) {
    super(message, { ...options, code: "PARSE_ERROR", retryable: true });
  }
}
