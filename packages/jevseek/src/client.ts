import { encodeAnswer } from "./answers";
import { getQuestionCodes } from "./codes";
import { mapWithConcurrency } from "./concurrency";
import { createDeepSeekFimTransport, type DeepSeekFimTransportOptions } from "./deepseek";
import { JevSeekAbortError, JevSeekTimeoutError, JevSeekValidationError } from "./errors";
import { createLLamaCppFimTransport, type LLamaCppFimTransportOptions } from "./llamacpp";
import { normalizeCandidateLogprobs } from "./logprobs";
import { buildPrompt, DEFAULT_PROMPT_TEMPLATE } from "./prompt";
import { resolveRetryOptions, withRetry } from "./retry";
import type {
  CompletionTransportRequest,
  DeepSeekFimCompletion,
  DeepSeekUsage,
  FimTransport,
  JevAnswer,
  JevSeekOptions,
  JevSeekProvider,
  JevSeekQuestionDiagnostic,
  JevSeekResponse,
  JevUsage,
  PromptTemplate,
  QuestionSet,
  RetryOptions,
  SystemOneRequest,
} from "./types";
import { validateQuestions, validateState } from "./validation";

const DEFAULT_MODEL = "deepseek-flash";
const DEFAULT_LLAMACPP_MODEL = "llamacpp";
const DEFAULT_CONCURRENCY = 4;
const DEFAULT_TIMEOUT_MS = 90_000;

interface CompletedQuestion {
  questionId: string;
  answer: JevAnswer;
  usage: DeepSeekUsage;
  model?: string;
  diagnostic: JevSeekQuestionDiagnostic;
}

function validatePositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new JevSeekValidationError(`${label} must be a positive integer`);
  }
}

function validateTimeout(value: number): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new JevSeekValidationError("timeoutMs must be a positive number");
  }
}

function validateProvider(value: string | undefined): JevSeekProvider {
  if (value === undefined || value === "deepseek") {
    return "deepseek";
  }
  if (value === "llamacpp") {
    return value;
  }
  throw new JevSeekValidationError('provider must be "deepseek" or "llamacpp"');
}

function validateMultimodalData(
  value: unknown,
  provider: JevSeekProvider,
): asserts value is string[] | undefined {
  if (value === undefined) {
    return;
  }
  if (provider !== "llamacpp") {
    throw new JevSeekValidationError("multimodal_data is only supported when provider is llamacpp");
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new JevSeekValidationError("multimodal_data must be a non-empty array");
  }
  if (value.some((item) => typeof item !== "string" || item.trim() === "")) {
    throw new JevSeekValidationError("multimodal_data entries must be non-empty strings");
  }
}

export class JevSeekClient {
  readonly model: string;
  readonly provider: JevSeekProvider;
  readonly concurrency: number;
  readonly timeoutMs: number;
  readonly retry: RetryOptions;
  readonly diagnosticsEnabledByDefault: boolean;
  readonly promptTemplate: PromptTemplate;

  private readonly transport: FimTransport;
  private readonly providerOptions: JevSeekOptions["providerOptions"];

  constructor(options: JevSeekOptions = {}) {
    const provider = validateProvider(options.provider);
    const model =
      options.model ?? (provider === "llamacpp" ? DEFAULT_LLAMACPP_MODEL : DEFAULT_MODEL);
    if (model.trim() === "") {
      throw new JevSeekValidationError("model must not be empty");
    }

    const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
    validatePositiveInteger(concurrency, "concurrency");

    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    validateTimeout(timeoutMs);

    this.model = model;
    this.provider = provider;
    this.concurrency = concurrency;
    this.timeoutMs = timeoutMs;
    this.retry = resolveRetryOptions(options.retry);
    this.diagnosticsEnabledByDefault = false;
    this.providerOptions = options.providerOptions as Record<string, unknown> | undefined;
    this.promptTemplate = options.promptTemplate ?? DEFAULT_PROMPT_TEMPLATE;

    if (options.transport !== undefined) {
      this.transport = options.transport;
    } else if (provider === "llamacpp") {
      const transportOptions: LLamaCppFimTransportOptions = {
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        fetch: options.fetch,
        headers: options.headers,
      };
      this.transport = createLLamaCppFimTransport(transportOptions);
    } else {
      const transportOptions: DeepSeekFimTransportOptions = {
        apiKey: options.apiKey,
        baseUrl: options.baseUrl,
        fetch: options.fetch,
        headers: options.headers,
      };
      this.transport = createDeepSeekFimTransport(transportOptions);
    }
  }

  async systemOne(input: SystemOneRequest): Promise<JevSeekResponse> {
    validateState(input.state);
    validateQuestions(input.questions);
    validateMultimodalData(input.multimodal_data, this.provider);
    if (input.model !== undefined && input.model.trim() === "") {
      throw new JevSeekValidationError("model must not be empty");
    }

    const entries = Object.entries(input.questions);
    const requestedModel = input.model ?? this.model;
    const promptTemplate = input.promptTemplate ?? this.promptTemplate;

    const completed = await mapWithConcurrency(
      entries,
      this.concurrency,
      async ([questionId, question]) => {
        return this.completeQuestion(
          input.state,
          questionId,
          question,
          requestedModel,
          promptTemplate,
          input.multimodal_data,
          input.signal,
        );
      },
    );

    const answers: Record<string, JevAnswer> = {};
    const diagnosticQuestions: Record<string, JevSeekQuestionDiagnostic> = {};
    const usage: JevUsage = { input_tokens: 0, output_tokens: 0 };

    for (const item of completed) {
      answers[item.questionId] = item.answer;
      usage.input_tokens += item.usage.prompt_tokens;
      usage.output_tokens += item.usage.completion_tokens;
      diagnosticQuestions[item.questionId] = item.diagnostic;
    }

    const response: JevSeekResponse = {
      model: completed[0]?.model ?? requestedModel,
      answers,
      usage,
    };
    if (input.debug === true || this.diagnosticsEnabledByDefault) {
      response.diagnostics = { questions: diagnosticQuestions };
    }
    return response;
  }

  private async completeQuestion(
    state: SystemOneRequest["state"],
    questionId: string,
    question: QuestionSet[string],
    model: string,
    promptTemplate: PromptTemplate,
    multimodalData?: string[],
    signal?: AbortSignal,
  ): Promise<CompletedQuestion> {
    const codes = getQuestionCodes(question);
    const prompt = buildPrompt(state, question, codes, promptTemplate);
    const request: CompletionTransportRequest = {
      maxTokens: 1,
      temperature: 0,
      topP: 1,
      topLogprobs: 20,
      model,
      prompt,
      ...(multimodalData === undefined ? {} : { multimodal_data: multimodalData }),
      ...(this.providerOptions === undefined ? {} : { providerOptions: this.providerOptions }),
    };
    const startedAt = Date.now();
    const call = await withRetry(
      async () => {
        return this.withTimeout(
          (attemptSignal) => this.transport.complete(request, { signal: attemptSignal }),
          signal,
        );
      },
      this.retry,
      signal,
    );

    const completion: DeepSeekFimCompletion = call.value;
    const probabilities = normalizeCandidateLogprobs(codes, completion.logprobs, completion.text);
    const answer = encodeAnswer(question, probabilities, codes);
    const diagnostic: JevSeekQuestionDiagnostic = {
      prompt,
      request,
      probabilities,
      sampledText: completion.text,
      topLogprobs: completion.logprobs?.top_logprobs ?? [],
      usage: completion.usage,
      attempts: call.attempts,
      durationMs: Date.now() - startedAt,
    };
    if (completion.requestId !== undefined) {
      diagnostic.requestId = completion.requestId;
    }

    return {
      questionId,
      answer,
      usage: completion.usage,
      model: completion.model,
      diagnostic,
    };
  }

  private async withTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    parentSignal?: AbortSignal,
  ): Promise<T> {
    if (parentSignal?.aborted) {
      throw new JevSeekAbortError(undefined, parentSignal.reason);
    }

    const controller = new AbortController();
    let timedOut = false;
    const onAbort = (): void => {
      controller.abort(parentSignal?.reason);
    };
    parentSignal?.addEventListener("abort", onAbort, { once: true });

    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, this.timeoutMs);

    try {
      return await operation(controller.signal);
    } catch (error) {
      if (timedOut) {
        throw new JevSeekTimeoutError(undefined, error);
      }
      if (parentSignal?.aborted) {
        throw new JevSeekAbortError(undefined, parentSignal.reason);
      }
      throw error;
    } finally {
      clearTimeout(timer);
      parentSignal?.removeEventListener("abort", onAbort);
    }
  }
}

export function createJevSeek(options: JevSeekOptions = {}): JevSeekClient {
  return new JevSeekClient(options);
}
