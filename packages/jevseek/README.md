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

- Customizable prompt templates with safe defaults.
- DeepSeek Beta FIM transport.
- llama.cpp native `/completion` transport and `multimodal_data`.
- Top-logprob normalization.
- Jev-shaped choice, score, and noul answers.
- Per-question concurrency limits.
- Timeout, AbortSignal, exponential retry, and `Retry-After`.
- Injectable fetch and transport.
- Debug diagnostics with usage, prompts, probabilities, and request IDs.

The default DeepSeek base URL is `https://api.deepseek.com/beta`. Supports Node.js 18+, Bun, workers, and browsers.

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

llama.cpp mode sends `POST /completion` with `n_probs`. A `/v1` base URL suffix is removed because `/completion` is a native server route. `multimodal_data` is accepted only in this mode; DeepSeek mode rejects it before sending a request. The model must have the matching multimodal projector loaded, and the prompt must contain the server media marker for every data entry.

The default llama.cpp base URL is `http://127.0.0.1:8080/v1`.

Set `promptTemplate` in `createJevSeek()` for a client-level override, or in `systemOne()` for one request. String templates support `{{state}}`, `{{question}}`, `{{instructions}}`, `{{options}}`, `{{questionType}}`, and `{{codes}}`; function templates receive the structured rendering context.

The default template uses readable option lines and ends with `Answer: \boxed{`. Reproduce the repository prompt score against JevBench Easy with `pnpm prompt:benchmark`.

See the repository documentation for the full HTTP and browser API.
