# Deep Jev Seek

[![CI](https://github.com/lenML/deep-jev-seek/actions/workflows/ci.yml/badge.svg)](https://github.com/lenML/deep-jev-seek/actions/workflows/ci.yml)

用 DeepSeek FIM 或 llama.cpp Completion API 提供 Jev / TypeSafe SystemOne 风格的离散决策接口。

项目有三个交付物：

- `@lenml/jevseek`：TypeScript npm 核心包。
- React WebUI：纯浏览器工作台，可连接 DeepSeek 或 llama.cpp。
- Bun Docker 镜像：接收 Jev 风格 HTTP 请求，返回 Jev 风格结果。

## 工作方式

每个 choice、score 或 noul 问题都会生成一次 completion 请求。模型只输出候选码，JevSeek 读取候选 token 概率，归一化后生成 choice、score 或 noul 答案。

- DeepSeek 模式：请求 `/beta/completions`，读取 `top_logprobs`。
- llama.cpp 模式：请求原生 `/completion`，读取 `n_probs`。

返回的是语言模型 token 概率。这类概率与 Jev 原始权重、官方校准概率不同。JevSeek 提供兼容协议和概率归一化，结果可能与 Jev 模型存在差异。

## npm 包

```bash
pnpm add @lenml/jevseek
```

```ts
import { createJevSeek } from "@lenml/jevseek";

const client = createJevSeek({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  model: "deepseek-flash",
  baseUrl: "https://api.deepseek.com/beta",
});

const result = await client.systemOne({
  state: {
    message: "I was charged twice. Please refund it today.",
  },
  questions: {
    category: {
      type: "choice",
      instructions: "Which team should handle this?",
      criteria: {
        billing: "Payment or subscription issues",
        technical: "Bugs or integration problems",
        sales: "Pricing or account questions",
      },
    },
    priority: {
      type: "score",
      instructions: "How urgent is this?",
      criteria: ["Low", "Normal", "Urgent"],
    },
    refundRequested: {
      type: "noul",
      instructions: "Is a refund explicitly requested?",
    },
  },
});
```

### llama.cpp

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
});
```

`multimodal_data` 只支持 llama.cpp：

```ts
await local.systemOne({
  state: "Describe the image.",
  questions: {
    safe: {
      type: "noul",
      instructions: "Is the image safe?",
    },
  },
  multimodal_data: ["<base64-data>"],
});
```

prompt 必须包含与每个数组项对应的服务器媒体标记。模型需要加载 mmproj。DeepSeek provider 会在请求前拒绝该字段。

### Prompt 模板

默认模板用可读选项行和 `Answer: \boxed{` 结尾。开发者可在客户端创建时覆盖，也可在单次 `systemOne` 请求中覆盖。字符串模板支持 `{{state}}`、`{{question}}`、`{{instructions}}`、`{{options}}`、`{{questionType}}`、`{{codes}}`；函数模板可读取结构化上下文并返回完整 prompt。

响应缺少候选 logprob 时，客户端自动使用严格候选码模板重试。严格重试仍失败时，默认 `missingLogprobPolicy: "zero"` 返回全 0 概率和 0 置信度；设为 `"error"` 可保留报错。

本地 llama.cpp 可用 JevBench Easy 公开集复跑模板：

````bash
pnpm prompt:benchmark


```ts
const result = await client.systemOne({
 state: { message: "I was charged twice." },
 questions: {
   refundRequested: {
     type: "noul",
     instructions: "Is a refund explicitly requested?",
   },
 },
 promptTemplate: ({ state, question, codeList }) => `Classify this state.
State: ${state}
Question: ${question}
Allowed codes: ${codeList}
Answer code:`,
});
````

类型和 HTTP 契约见 [docs/api.md](docs/api.md)。

## WebUI

线上地址：

```text
https://lenml.github.io/deep-jev-seek/
```

浏览器可直接连接 DeepSeek 或 llama.cpp。DeepSeek API Key 默认保存在当前标签页的 `sessionStorage`；选择「This browser」后改用 `localStorage`。项目不代理、不托管 Key。

Playground、Benchmark、Batch 标签使用 hash 路由，地址分别为 `#/playground`、`#/benchmark`、`#/batch`，支持直达链接与浏览器前进后退。

选择 llama.cpp 后，输入表单会显示图片上传区。上传的图片会转成 `multimodal_data` 所需的 base64 数组，也可在 Base64 JSON 区域手动微调。

Benchmark 模式加载 MMLU-Pro validation 题目，可运行前 N 题并对比标准答案与正确率。题目来自 [Hugging Face datasets-server](https://datasets-server.huggingface.co/rows?dataset=TIGER-Lab%2FMMLU-Pro&config=default&split=validation&offset=0&length=100)。

本地开发：

```bash
pnpm install
pnpm --filter @lenml/jevseek build
pnpm --filter @lenml/jevseek-web dev
```

## Docker

镜像由 GitHub Actions 发布到 GHCR：

```bash
docker run --rm -p 8787:8787 \
  -e DEEPSEEK_API_KEY=sk-... \
  ghcr.io/lenml/deep-jev-seek:latest
```

调用示例：

```bash
curl http://localhost:8787/v1/systemone \
  -H "content-type: application/json" \
  -H "authorization: Bearer sk-..." \
  -d '{
    "model": "jev-latest",
    "state": "The request is urgent.",
    "questions": {
      "urgent": {
        "type": "noul",
        "instructions": "Is it urgent?"
      }
    }
  }'
```

Authorization Bearer Key 优先于容器环境变量 `DEEPSEEK_API_KEY`。

llama.cpp 模式：

```bash
docker run --rm -p 8787:8787 \
  -e JEVSEEK_PROVIDER=llamacpp \
  -e LLAMACPP_BASE_URL=http://host.docker.internal:8080/v1 \
  -e LLAMACPP_MODEL=local-model \
  ghcr.io/lenml/deep-jev-seek:latest
```

Linux 下按 Docker 网络配置替换 `LLAMACPP_BASE_URL`。

## 开发命令

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm stats
```

`pnpm stats` 按单文件行数或字符数输出代码规模。默认将 250 行以上文件标记为 `OVER`；CI 使用 `pnpm stats:check` 检查超长文件。

目录结构：

```text
apps/web/           React + Zustand + Shadcn WebUI
apps/server/        Bun HTTP 服务
packages/jevseek/   npm 核心包
docs/               协议、设计与发布文档
```

发布说明见 [docs/release.md](docs/release.md)，实施设计见 [docs/dev/jevseek-design.md](docs/dev/jevseek-design.md)。

## 限制

- DeepSeek FIM 单次最多返回 20 个 top logprobs，因此单个 choice 问题最多 20 个候选。
- 每个问题独立请求一次，问题越多，延迟和成本越高。
- 浏览器直连依赖上游 CORS 与用户本地网络。
- llama.cpp 模型必须输出候选码 token，并提供 `n_probs`。不同模型的 prompt 敏感性不同。
- 不提供 API Key 托管、流式输出、批处理或 Jev 官方校准参数。
