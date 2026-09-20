# Deep Jev Seek

[![CI](https://github.com/lenML/deep-jev-seek/actions/workflows/ci.yml/badge.svg)](https://github.com/lenML/deep-jev-seek/actions/workflows/ci.yml)

用 DeepSeek FIM Completion API 提供 Jev / TypeSafe SystemOne 风格的离散决策接口。

项目有三个交付物：

- `@lenml/jevseek`：TypeScript npm 核心包。
- React WebUI：纯浏览器工作台，使用自有 DeepSeek API Key。
- Bun Docker 镜像：接收 Jev 风格 HTTP 请求，返回 Jev 风格结果。

## 工作方式

每个 choice、score 或 noul 问题都会生成一次 DeepSeek FIM Completion 请求。模型只输出候选码，JevSeek 从 `top_logprobs` 读取候选 token 概率，归一化后生成 choice、score 或 noul 答案。

DeepSeek 返回语言模型 token 概率。这类概率与 Jev 原始权重、官方校准概率不同。JevSeek 提供兼容协议和概率归一化，结果可能与 Jev 模型存在差异。

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

### Prompt 模板

默认模板只是起点。开发者可在客户端创建时覆盖，也可在单次 `systemOne` 请求中覆盖。字符串模板支持 `{{state}}`、`{{question}}`、`{{questionType}}`、`{{codes}}`；函数模板可读取结构化上下文并返回完整 prompt。

````ts
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


类型和 HTTP 契约见 [docs/api.md](docs/api.md)。

## WebUI

线上地址：

```text
https://lenml.github.io/deep-jev-seek/
````

浏览器直接调用 DeepSeek Beta FIM API。API Key 默认保存在当前标签页的 `sessionStorage`；选择「This browser」后改用 `localStorage`。项目不代理、不托管 Key。

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

- DeepSeek FIM 单次最多返回 20 个 top logprobs，因此首版单个 choice 问题最多 20 个候选。
- 每个问题独立请求一次，问题越多，延迟和成本越高。
- 浏览器直连依赖 DeepSeek 的 CORS 与用户本地网络。
- 不提供 API Key 托管、流式输出、批处理或 Jev 官方校准参数。
