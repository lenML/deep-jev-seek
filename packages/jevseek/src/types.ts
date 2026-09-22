export type JevState = string | Record<string, unknown> | unknown[];
export type JevInstructions = string | Record<string, unknown> | unknown[];

export type JevQuestionType = "choice" | "score" | "noul";

export interface ChoiceQuestion {
  type: "choice";
  instructions: JevInstructions;
  criteria: Record<string, string | null>;
}

export interface ScoreQuestion {
  type: "score";
  instructions: JevInstructions;
  criteria: string[];
}

export interface NoulQuestion {
  type: "noul";
  instructions: JevInstructions;
  criteria?: {
    false?: string;
    true?: string;
  };
}

export type JevQuestion = ChoiceQuestion | ScoreQuestion | NoulQuestion;
export type QuestionSet = Record<string, JevQuestion>;

export interface PromptTemplateContext {
  state: string;
  question: string;
  instructions: string;
  options: string;
  questionType: JevQuestionType;
  codes: readonly string[];
  codeList: string;
}

export type PromptTemplate = string | ((context: PromptTemplateContext) => string);

export interface ChoiceAnswer {
  type: "choice";
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ScoreAnswer {
  type: "score";
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface NoulAnswer {
  type: "noul";
  noul: number;
}

export type JevAnswer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

export interface JevUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface SystemOneRequest {
  state: JevState;
  questions: QuestionSet;
  model?: string;
  debug?: boolean;
  signal?: AbortSignal;
  promptTemplate?: PromptTemplate;
  fallbackPromptTemplate?: PromptTemplate;
  missingLogprobPolicy?: MissingLogprobPolicy;
  multimodal_data?: string[];
}

export interface JevSeekResponse {
  model: string;
  answers: Record<string, JevAnswer>;
  usage: JevUsage;
  diagnostics?: JevSeekDiagnostics;
}

export interface DeepSeekLogprobs {
  tokens?: Array<string | null>;
  token_logprobs?: Array<number | null>;
  top_logprobs?: Array<Record<string, number>>;
}

export interface DeepSeekUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
    prompt_cache_hit_tokens?: number;
    prompt_cache_miss_tokens?: number;
  };
}

export interface DeepSeekFimRequest {
  model: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  logprobs?: number;
  stream?: false;
  suffix?: string;
}

export type DeepSeekFimProviderOptions = Partial<
  Omit<DeepSeekFimRequest, "model" | "prompt" | "stream">
>;

export interface LLamaCppCompletionRequest {
  model?: string;
  prompt:
    | string
    | {
        prompt_string: string;
        multimodal_data?: string[];
      };
  n_predict?: number;
  temperature?: number;
  top_p?: number;
  n_probs?: number;
  stream?: false;
  seed?: number;
  stop?: string[];
  cache_prompt?: boolean;
  post_sampling_probs?: boolean;
}

export type LLamaCppFimProviderOptions = Partial<
  Omit<LLamaCppCompletionRequest, "model" | "prompt" | "stream">
>;

export type JevSeekProvider = "deepseek" | "llamacpp";
export type JevSeekProviderOptions = DeepSeekFimProviderOptions | LLamaCppFimProviderOptions;
export type MissingLogprobPolicy = "error" | "zero";

export interface CompletionTransportRequest {
  model: string;
  prompt: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  topLogprobs: number;
  multimodal_data?: string[];
  providerOptions?: Record<string, unknown>;
}

export interface DeepSeekFimCompletion {
  text: string;
  logprobs?: DeepSeekLogprobs;
  usage: DeepSeekUsage;
  id?: string;
  model?: string;
  requestId?: string;
  raw: unknown;
}

export interface FimTransportContext {
  signal: AbortSignal;
}

export interface FimTransport {
  complete(
    request: CompletionTransportRequest,
    context: FimTransportContext,
  ): Promise<DeepSeekFimCompletion>;
}

export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitter: boolean;
}

export interface JevSeekOptions {
  apiKey?: string;
  model?: string;
  provider?: JevSeekProvider;
  baseUrl?: string;
  fetch?: typeof fetch;
  transport?: FimTransport;
  headers?: HeadersInit;
  concurrency?: number;
  timeoutMs?: number;
  retry?: Partial<RetryOptions>;
  providerOptions?: JevSeekProviderOptions;
  promptTemplate?: PromptTemplate;
  fallbackPromptTemplate?: PromptTemplate;
  missingLogprobPolicy?: MissingLogprobPolicy;
}

export interface JevSeekQuestionDiagnostic {
  prompt: string;
  request: CompletionTransportRequest;
  probabilities: Record<string, number>;
  sampledText: string;
  topLogprobs: Array<Record<string, number>>;
  usage: DeepSeekUsage;
  attempts: number;
  durationMs: number;
  missingLogprobsFallback?: "zero";
  requestId?: string;
}

export interface JevSeekDiagnostics {
  questions: Record<string, JevSeekQuestionDiagnostic>;
}
