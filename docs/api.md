# API

## NPM 包

```bash
pnpm add @lenml/jevseek
```

```ts
import { createJevSeek } from "@lenml/jevseek";

const client = createJevSeek({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  model: "deepseek-flash",
  concurrency: 4,
  timeoutMs: 90_000,
});

const result = await client.systemOne({
  state: {
    message: "The Stripe integration has failed for three days.",
  },
  questions: {
    department: {
      type: "choice",
      instructions: "Which team should handle this?",
      criteria: {
        billing: "Payment or subscription issues",
        technical: "Bugs or integration problems",
        sales: "Pricing or account questions",
      },
    },
    frustration: {
      type: "score",
      instructions: "How frustrated is the customer?",
      criteria: ["Calm", "Frustrated", "Very angry"],
    },
    urgent: {
      type: "noul",
      instructions: "The message is time-sensitive.",
    },
  },
});

console.log(result.answers);
console.log(result.usage);
```

返回形状：

```json
{
  "model": "deepseek-flash",
  "answers": {
    "department": {
      "type": "choice",
      "choice": "technical",
      "probabilities": {
        "billing": 0.08,
        "technical": 0.85,
        "sales": 0.07
      },
      "confidence": 0.82
    },
    "frustration": {
      "type": "score",
      "score": 1.6,
      "legend": {
        "0": "Calm",
        "1": "Frustrated",
        "2": "Very angry"
      },
      "probabilities": {
        "0": 0.05,
        "1": 0.3,
        "2": 0.65
      },
      "confidence": 0.78
    },
    "urgent": {
      "type": "noul",
      "noul": 0.92
    }
  },
  "usage": {
    "input_tokens": 312,
    "output_tokens": 48
  }
}
```

## HTTP 服务

```bash
docker run --rm -p 8787:8787 \
  -e DEEPSEEK_API_KEY=sk-... \
  ghcr.io/lenml/deep-jev-seek:latest
```

请求：

```http
POST /v1/systemone
Authorization: Bearer sk-...
Content-Type: application/json
```

请求体与 NPM 包一致。请求头 Key 优先于容器环境变量。

模型：

- `jev-latest`、`jev-preview`：映射到 `DEEPSEEK_MODEL`。
- `deepseek-flash`、`deepseek-v4-pro`：直接传给 DeepSeek FIM。

其他路由：

- `GET /healthz`
- `GET /v1/models`

## 浏览器

WebUI 直接调用 DeepSeek Beta FIM API。用户 API Key 只在浏览器中使用。生产页面由 GitHub Pages 托管，不提供 Key 托管或代理。
