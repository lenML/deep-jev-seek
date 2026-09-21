# @lenml/jevseek

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

The default template uses readable option lines and ends with `Answer: \boxed{`. If the response contains no candidate logprob, the client retries with `DEFAULT_FALLBACK_PROMPT_TEMPLATE`. If that still fails, the default `missingLogprobPolicy: "zero"` returns zero probabilities with confidence `0`; set it to `"error"` to retain the parse error. Run `pnpm prompt:benchmark` to reproduce the JevBench Easy prompt score.

See the repository documentation for the full HTTP and browser API.
