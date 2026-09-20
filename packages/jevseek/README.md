# @lenml/jevseek

DeepSeek FIM adapter for Jev-style SystemOne decisions.

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
- Top-logprob normalization.
- Jev-shaped choice, score, and noul answers.
- Per-question concurrency limits.
- Timeout, AbortSignal, exponential retry, and `Retry-After`.
- Injectable fetch and transport.
- Debug diagnostics with usage, prompts, probabilities, and request IDs.

The default DeepSeek base URL is `https://api.deepseek.com/beta`. Supports Node.js 18+, Bun, workers, and browsers.

Set `promptTemplate` in `createJevSeek()` for a client-level override, or in `systemOne()` for one request. String templates support `{{state}}`, `{{question}}`, `{{questionType}}`, and `{{codes}}`; function templates receive the structured rendering context.

See the repository documentation for the full HTTP and browser API.
