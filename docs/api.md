# API

## npm 包

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

响应示例：

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

## Prompt 模板

`createJevSeek()` 和 `systemOne()` 都接受 `promptTemplate`。请求级设置优先于客户端级设置。

字符串模板支持以下占位符：

- `{{state}}`：稳定序列化后的 state。
- `{{question}}`：按候选码编码后的 question JSON。
- `{{questionType}}`：`choice`、`score` 或 `noul`。
- `{{codes}}`：逗号分隔的候选码。

````ts
const customClient = createJevSeek({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  promptTemplate: `Classify the state.
<state>{{state}}</state>
<question>{{question}}</question>
Allowed codes: {{codes}}
Answer code:`,
});

await customClient.systemOne({
  state: { message: "I was charged twice." },
  questions: {
    refundRequested: {
      type: "noul",
      instructions: "Is a refund explicitly requested?",
    },
  },
  promptTemplate: ({ question, state, codeList }) => `Custom prompt
State: ${state}
Question: ${question}
Codes: ${codeList}
Answer code:`,
});


函数模板收到 `state`、`question`、`questionType`、`codes` 和 `codeList`，并返回完整 prompt 字符串。默认模板通过 `DEFAULT_PROMPT_TEMPLATE` 导出。

## HTTP 服务

```bash
docker run --rm -p 8787:8787 \
  -e DEEPSEEK_API_KEY=sk-... \
  ghcr.io/lenml/deep-jev-seek:latest
````

调用：

```http
POST /v1/systemone
Authorization: Bearer sk-...
Content-Type: application/json
```

请求体格式与 npm 包相同。请求头 Key 优先于容器环境变量。

模型映射：

- `jev-latest`、`jev-preview`：映射到 `DEEPSEEK_MODEL`。
- `deepseek-flash`、`deepseek-v4-pro`：直接传给 DeepSeek FIM。

其他端点：

- `GET /healthz`
- `GET /v1/models`

## 浏览器

WebUI 直接调用 DeepSeek Beta FIM API。API Key 只保存在浏览器中。生产页面由 GitHub Pages 托管，不代理请求，也不托管 Key。
