# @lenml/jevseek

[![npm version](https://img.shields.io/npm/v/@lenml/jevseek.svg)](https://www.npmjs.com/package/@lenml/jevseek)
[![npm downloads](https://img.shields.io/npm/dm/@lenml/jevseek.svg)](https://www.npmjs.com/package/@lenml/jevseek)
[![CI](https://github.com/lenML/deep-jev-seek/actions/workflows/ci.yml/badge.svg)](https://github.com/lenML/deep-jev-seek/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@lenml/jevseek.svg)](https://github.com/lenML/deep-jev-seek/blob/main/LICENSE)

DeepSeek FIM and llama.cpp completion adapter for Jev-style SystemOne decisions.

```bash
pnpm add @lenml/jevseek
```

```ts
import { createJevSeek } from "@lenml/jevseek";

const client = createJevSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
  model: "deepseek-flash",
});

const result = await client.systemOne({
  state: "I was charged twice and need help today.",
  questions: {
    department: {
      type: "choice",
      instructions: "Which team should handle this?",
      criteria: {
        billing: "Payment or subscription",
        technical: "Bug or integration",
        sales: "Pricing or account",
      },
    },
    urgent: {
      type: "noul",
      instructions: "The request is time-sensitive.",
    },
  },
});
```

Question types:

- `choice`
- `score`
- `noul`

Features:

- Custom or default prompt templates, with a strict fallback for missing candidate logprobs.
- DeepSeek Beta FIM transport.
- llama.cpp native `/completion` transport and `multimodal_data`.
- Candidate logprob normalization.
- Jev-shaped choice, score, and noul answers.
- Per-question concurrency limits.
- Timeout, AbortSignal, exponential retry, and `Retry-After`.
- Injectable fetch and transport.
- Debug diagnostics for usage, prompts, probabilities, and request IDs.

The default DeepSeek base URL is `https://api.deepseek.com/beta`. Runs on Node.js 18+, Bun, workers, and browsers.

Provider-specific defaults are used when `promptTemplate` is not set. DeepSeek uses a function-completion template that lands the first token on a candidate code. llama.cpp keeps the readable `Answer: \boxed{` template.

## Cost estimates

For a 200-token state and three 100-token questions, JevSeek sends three DeepSeek FIM requests and repeats the state: about 900 input tokens and 3 output tokens. Jev processes the same state and questions in one input-only request: about 500 tokens. Prices below use the 2026-09-22 published rates and no cache, retry, or concurrency discount.

| Backend             | 1,000 SystemOne requests | Relative to Jev |
| ------------------- | ------------------------ | --------------- |
| Jev                 | ¥0.15                    | 1.0×            |
| DeepSeek Flash idle | ¥0.91                    | 6.0×            |
| DeepSeek Flash peak | ¥1.82                    | 12.1×           |
| DeepSeek Pro idle   | ¥4.09                    | 27.1×           |
| DeepSeek Pro peak   | ¥8.18                    | 54.1×           |

The comparison uses `$1 = ¥7.2` for Jev's USD price. DeepSeek prompt-cache hits, additional questions, fallback retries, and longer states change the result. See the [full cost model](https://github.com/lenML/deep-jev-seek#成本估算) for formulas and llama.cpp estimates for 2B, 4B, 9B, 28B, and 30B-A3B models.

## llama.cpp

```ts
const local = createJevSeek({
  provider: "llamacpp",
  baseUrl: "http://127.0.0.1:8080/v1",
  model: "local-model",
});

const result = await local.systemOne({
  state: "The request is urgent.",
  questions: {
    urgent: {
      type: "noul",
      instructions: "Is it urgent?",
    },
  },
  multimodal_data: ["<base64-data>"],
});
```

llama.cpp mode sends `POST /completion` with `n_probs`. A `/v1` base URL suffix is removed because `/completion` is a native server route. `multimodal_data` is accepted only in this mode; DeepSeek mode rejects it before sending a request. The model needs a matching multimodal projector, and the prompt needs one server media marker per data entry.

The default llama.cpp base URL is `http://127.0.0.1:8080/v1`.

Override `promptTemplate` in `createJevSeek()` for the client, or in `systemOne()` for one request. String templates support `{{state}}`, `{{question}}`, `{{instructions}}`, `{{options}}`, `{{questionType}}`, and `{{codes}}`; function templates receive the structured rendering context.

If the response contains no candidate logprob, the client retries with the provider-specific fallback template. Use `fallbackPromptTemplate` to override it at client or request level. If that still fails, the default `missingLogprobPolicy: "zero"` returns zero probabilities with confidence `0`; set it to `"error"` to retain the parse error.

The DeepSeek defaults were measured on all 70 MMLU-Pro validation rows on 2026-09-23. `deepseek-flash` scored 74-76% across repeat runs and `deepseek-v4-pro` scored 78.57%, with no zero-probability fallback. DeepSeek FIM currently returns a usable logprob only for the sampled token; other `top_logprobs` are commonly `-9999`, so results are one-hot selections rather than calibrated distributions.

Run `pnpm prompt:benchmark` to reproduce the llama.cpp JevBench Easy prompt score.

See the repository documentation for the full HTTP and browser API.
