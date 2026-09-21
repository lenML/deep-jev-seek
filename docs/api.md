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

## Provider 模式

默认 provider 是 `deepseek`，请求 `POST /beta/completions`。`provider` 改为 `"llamacpp"` 后，客户端请求 llama.cpp 原生 `POST /completion`，并用 `n_probs` 获取候选概率。

```ts
const local = createJevSeek({
  provider: "llamacpp",
  baseUrl: "http://127.0.0.1:8080/v1",
  model: "local-model",
});

const result = await local.systemOne({
  state: { message: "The request is urgent." },
  questions: {
    urgent: {
      type: "noul",
      instructions: "Is it urgent?",
    },
  },
});
```

`baseUrl` 支持带 `/v1`；transport 会移除该后缀，再请求 `/completion`。也可直接填 `http://127.0.0.1:8080`。

### multimodal_data

`multimodal_data` 只支持 llama.cpp provider：

```json
{
  "state": "Describe the image.",
  "questions": {
    "safe": {
      "type": "noul",
      "instructions": "Is the image safe?"
    }
  },
  "multimodal_data": ["<base64-data>"]
}
```

每个数组项会传给 llama.cpp 的 `prompt.multimodal_data`。prompt 中必须为每个数组项放置一个服务器媒体标记。模型未加载 mmproj 或不支持对应模态时，llama.cpp 会返回上游错误。

DeepSeek provider 收到 `multimodal_data` 会在发请求前抛出校验错误。HTTP 服务返回 `400 multimodal_not_supported`。

## Prompt 模板

`createJevSeek()` 和 `systemOne()` 都接受 `promptTemplate`。请求级设置优先于客户端级设置。

字符串模板支持以下占位符：

- `{{state}}`：稳定序列化后的 state。
- `{{question}}`：按候选码编码后的 question JSON。
- `{{instructions}}`：可读题目说明；非字符串 instruction 会稳定序列化。
- `{{options}}`：每行一个候选，格式为 `- 候选码 = 描述`。`noul` 使用 `0/1`。
- `{{questionType}}`：`choice`、`score` 或 `noul`。
- `{{codes}}`：逗号分隔的候选码。

```ts
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
```

函数模板收到 `state`、`question`、`instructions`、`options`、`questionType`、`codes` 和 `codeList`，并返回完整 prompt 字符串。默认模板通过 `DEFAULT_PROMPT_TEMPLATE` 导出。

响应没有候选 logprob 时，客户端会使用 `DEFAULT_FALLBACK_PROMPT_TEMPLATE` 再请求一次。严格重试仍没有候选时，`missingLogprobPolicy` 决定结果：

- `"zero"`：默认。返回全 0 概率和 `confidence: 0`，避免 benchmark 与批量任务中断。
- `"error"`：抛出 `PARSE_ERROR`。

## HTTP 服务

```bash
docker run --rm -p 8787:8787 \
  -e DEEPSEEK_API_KEY=sk-... \
  ghcr.io/lenml/deep-jev-seek:latest
```

调用：

```http
POST /v1/systemone
Authorization: Bearer sk-...
Content-Type: application/json
```

请求体格式与 npm 包相同。请求头 Key 优先于容器环境变量。

llama.cpp 模式：

```bash
docker run --rm -p 8787:8787 \
  -e JEVSEEK_PROVIDER=llamacpp \
  -e LLAMACPP_BASE_URL=http://host.docker.internal:8080/v1 \
  -e LLAMACPP_MODEL=local-model \
  ghcr.io/lenml/deep-jev-seek:latest
```

Linux 下访问宿主机模型服务时，按 Docker 网络配置替换 `LLAMACPP_BASE_URL`。llama.cpp 模式的 `LLAMACPP_API_KEY` 可省略。

模型映射：

- `jev-latest`、`jev-preview`：DeepSeek 模式映射到 `DEEPSEEK_MODEL`，llama.cpp 模式映射到 `LLAMACPP_MODEL`。
- `deepseek-flash`、`deepseek-v4-pro`：直接传给 DeepSeek FIM。
- llama.cpp 模式的其他模型名直接传给 llama.cpp。

其他端点：

- `GET /healthz`
- `GET /v1/models`

## 浏览器

WebUI 可切换 DeepSeek 与 llama.cpp。DeepSeek API Key 只保存在浏览器中。生产页面由 GitHub Pages 托管，请求直接从浏览器发往配置的 provider，服务端不代理请求，也不保存 Key。
