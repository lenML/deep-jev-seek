import { mapWithConcurrency } from "./concurrency";
import { createTransport } from "./client-transport";
import { JevSeekValidationError } from "./errors";
import {
  DEFAULT_CONCURRENCY,
  DEFAULT_LLAMACPP_MODEL,
  DEFAULT_MODEL,
  DEFAULT_TIMEOUT_MS,
  validateMissingLogprobPolicy,
  validateMultimodalData,
  validatePositiveInteger,
  validateProvider,
  validateTimeout,
} from "./client-validation";
import {
  defaultFallbackPromptTemplateForProvider,
  defaultPromptTemplateForProvider,
} from "./prompt";
import { completeQuestion } from "./question-completion";
import { resolveRetryOptions } from "./retry";
import type {
  FimTransport,
  JevAnswer,
  JevSeekOptions,
  JevSeekProvider,
  JevSeekQuestionDiagnostic,
  JevSeekResponse,
  JevUsage,
  MissingLogprobPolicy,
  PromptTemplate,
  RetryOptions,
  SystemOneRequest,
} from "./types";
import { validateQuestions, validateState } from "./validation";

export class JevSeekClient {
  readonly model: string;
  readonly provider: JevSeekProvider;
  readonly concurrency: number;
  readonly timeoutMs: number;
  readonly retry: RetryOptions;
  readonly diagnosticsEnabledByDefault: boolean;
  readonly promptTemplate: PromptTemplate;
  readonly fallbackPromptTemplate: PromptTemplate;
  readonly missingLogprobPolicy: MissingLogprobPolicy;

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
    this.promptTemplate = options.promptTemplate ?? defaultPromptTemplateForProvider(provider);
    this.fallbackPromptTemplate =
      options.fallbackPromptTemplate ?? defaultFallbackPromptTemplateForProvider(provider);
    this.missingLogprobPolicy = validateMissingLogprobPolicy(options.missingLogprobPolicy);

    this.transport = createTransport(options, provider);
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
    const fallbackPromptTemplate = input.fallbackPromptTemplate ?? this.fallbackPromptTemplate;
    const missingLogprobPolicy = input.missingLogprobPolicy ?? this.missingLogprobPolicy;

    const completed = await mapWithConcurrency(
      entries,
      this.concurrency,
      async ([questionId, question]) => {
        return completeQuestion({
          transport: this.transport,
          state: input.state,
          questionId,
          question,
          model: requestedModel,
          promptTemplate,
          fallbackPromptTemplate,
          missingLogprobPolicy,
          retry: this.retry,
          timeoutMs: this.timeoutMs,
          ...(this.providerOptions === undefined ? {} : { providerOptions: this.providerOptions }),
          ...(input.multimodal_data === undefined ? {} : { multimodalData: input.multimodal_data }),
          ...(input.signal === undefined ? {} : { signal: input.signal }),
        });
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
}

export function createJevSeek(options: JevSeekOptions = {}): JevSeekClient {
  return new JevSeekClient(options);
}
