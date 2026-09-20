# @lenml/jevseek

Use DeepSeek FIM token logprobs as a Jev-style SystemOne API.

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

Supported question types:

- `choice`
- `score`
- `noul`

Main features:

- DeepSeek Beta FIM transport.
- Top-logprob normalization.
- Jev-shaped choice, score, and noul answers.
- Per-question concurrency.
- Timeout, AbortSignal, exponential retry, and `Retry-After`.
- Injectable fetch and transport for tests or gateways.
- Debug diagnostics with usage, prompts, probabilities, and request IDs.

Default DeepSeek base URL is `https://api.deepseek.com/beta`. The package uses native `fetch` and supports Node.js 18+, Bun, workers, and browsers.

See the repository documentation for the full HTTP and browser API.
