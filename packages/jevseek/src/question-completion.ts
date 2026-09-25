import { encodeAnswer } from "./answers";
import { getQuestionCodes } from "./codes";
import { JevSeekAbortError, JevSeekParseError, JevSeekTimeoutError } from "./errors";
import { normalizeCandidateLogprobs } from "./logprobs";
import { buildPrompt } from "./prompt";
import { withRetry } from "./retry";
import type {
  CompletionTransportRequest,
  DeepSeekFimCompletion,
  DeepSeekUsage,
  FimTransport,
  JevAnswer,
  JevQuestion,
  JevSeekQuestionDiagnostic,
  JevState,
  MissingLogprobPolicy,
  PromptTemplate,
  RetryOptions,
} from "./types";

export interface CompletedQuestion {
  questionId: string;
  answer: JevAnswer;
  usage: DeepSeekUsage;
  model?: string;
  diagnostic?: JevSeekQuestionDiagnostic;
}

export interface CompleteQuestionOptions {
  transport: FimTransport;
  state: JevState;
  questionId: string;
  question: JevQuestion;
  model: string;
  promptTemplate: PromptTemplate;
  fallbackPromptTemplate: PromptTemplate;
  missingLogprobPolicy: MissingLogprobPolicy;
  retry: RetryOptions;
  timeoutMs: number;
  providerOptions?: Record<string, unknown>;
  multimodalData?: string[];
  signal?: AbortSignal;
}

interface SuccessfulCompletion {
  completion: DeepSeekFimCompletion;
  request: CompletionTransportRequest;
  probabilities: Record<string, number>;
  missingLogprobsFallback?: "zero";
}

function emptyUsage(): DeepSeekUsage {
  return { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
}

function addUsage(current: DeepSeekUsage, next: DeepSeekUsage): DeepSeekUsage {
  const promptTokens = current.prompt_tokens + next.prompt_tokens;
  const completionTokens = current.completion_tokens + next.completion_tokens;
  return {
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: promptTokens + completionTokens,
  };
}

function zeroProbabilities(codes: readonly string[]): Record<string, number> {
  return Object.fromEntries(codes.map((code) => [code, 0]));
}

function encodeSingleCandidateAnswer(
  question: JevQuestion,
  codes: readonly string[],
): JevAnswer | undefined {
  const code = codes[0];
  if (codes.length !== 1 || code === undefined) {
    return undefined;
  }
  return encodeAnswer(question, { [code]: 1 }, codes);
}

async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
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
  }, timeoutMs);

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

function shouldUseZeroFallback(input: {
  error: unknown;
  attempt: number;
  fallbackActive: boolean;
  missingLogprobPolicy: MissingLogprobPolicy;
  maxAttempts: number;
}): boolean {
  return (
    input.error instanceof JevSeekParseError &&
    input.missingLogprobPolicy === "zero" &&
    (input.fallbackActive || input.attempt >= input.maxAttempts)
  );
}

function diagnosticFor(input: {
  completed: SuccessfulCompletion;
  usage: DeepSeekUsage;
  attempts: number;
  startedAt: number;
}): JevSeekQuestionDiagnostic {
  const { completion, request, probabilities, missingLogprobsFallback } = input.completed;
  const diagnostic: JevSeekQuestionDiagnostic = {
    prompt: request.prompt,
    request,
    probabilities,
    sampledText: completion.text,
    topLogprobs: completion.logprobs?.top_logprobs ?? [],
    usage: input.usage,
    attempts: input.attempts,
    durationMs: Date.now() - input.startedAt,
  };
  if (completion.requestId !== undefined) {
    diagnostic.requestId = completion.requestId;
  }
  if (missingLogprobsFallback !== undefined) {
    diagnostic.missingLogprobsFallback = missingLogprobsFallback;
  }
  return diagnostic;
}

export async function completeQuestion(input: CompleteQuestionOptions): Promise<CompletedQuestion> {
  const codes = getQuestionCodes(input.question);
  const singleCandidateAnswer = encodeSingleCandidateAnswer(input.question, codes);
  if (singleCandidateAnswer !== undefined) {
    return {
      questionId: input.questionId,
      answer: singleCandidateAnswer,
      usage: emptyUsage(),
    };
  }

  const prompt = buildPrompt(input.state, input.question, codes, input.promptTemplate);
  const fallbackPrompt = buildPrompt(
    input.state,
    input.question,
    codes,
    input.fallbackPromptTemplate,
  );
  const request: CompletionTransportRequest = {
    maxTokens: 1,
    temperature: 0,
    topP: 1,
    topLogprobs: 20,
    model: input.model,
    prompt,
    ...(input.multimodalData === undefined ? {} : { multimodal_data: input.multimodalData }),
    ...(input.providerOptions === undefined ? {} : { providerOptions: input.providerOptions }),
  };
  const startedAt = Date.now();
  let fallbackActive = false;
  let totalUsage = emptyUsage();

  const call = await withRetry(
    async (attempt) => {
      const retriedWithFallback = fallbackActive;
      const activeRequest = { ...request, prompt: retriedWithFallback ? fallbackPrompt : prompt };
      const completion = await withTimeout(
        (attemptSignal) => input.transport.complete(activeRequest, { signal: attemptSignal }),
        input.timeoutMs,
        input.signal,
      );
      totalUsage = addUsage(totalUsage, completion.usage);

      try {
        return {
          completion,
          request: activeRequest,
          probabilities: normalizeCandidateLogprobs(codes, completion.logprobs, completion.text),
        } satisfies SuccessfulCompletion;
      } catch (error) {
        if (error instanceof JevSeekParseError) {
          fallbackActive = true;
        }
        const fallback = shouldUseZeroFallback({
          error,
          attempt,
          fallbackActive: retriedWithFallback,
          missingLogprobPolicy: input.missingLogprobPolicy,
          maxAttempts: input.retry.maxAttempts,
        });
        if (!fallback) {
          throw error;
        }
        return {
          completion,
          request: activeRequest,
          probabilities: zeroProbabilities(codes),
          missingLogprobsFallback: "zero",
        } satisfies SuccessfulCompletion;
      }
    },
    input.retry,
    input.signal,
  );

  const completed = call.value;
  return {
    questionId: input.questionId,
    answer: encodeAnswer(input.question, completed.probabilities, codes),
    usage: totalUsage,
    model: completed.completion.model,
    diagnostic: diagnosticFor({
      completed,
      usage: totalUsage,
      attempts: call.attempts,
      startedAt,
    }),
  };
}
