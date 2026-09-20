# Deep Jev Seek

[![CI](https://github.com/lenML/deep-jev-seek/actions/workflows/ci.yml/badge.svg)](https://github.com/lenML/deep-jev-seek/actions/workflows/ci.yml)

用 DeepSeek FIM Completion API 模拟 Jev / TypeSafe SystemOne 风格的离散决策接口。

项目包含三个交付物：

- `@lenml/jevseek`: TypeScript NPM 核心包。
- React WebUI: 纯浏览器工作台，用户自备 DeepSeek API Key。
- Bun Docker 镜像: 接收 Jev 风格 HTTP 请求并返回 Jev 风格结果。

## 原理

每个 choice、score 或 noul 问题被转换为一次 DeepSeek FIM Completion 请求。模型只输出一个候选码，JevSeek 从 `top_logprobs` 提取候选 token 概率，再归一化为 choice、score 或 noul 答案。

DeepSeek 返回的是语言模型 token 概率，不是 Jev 原始权重或官方校准概率。本项目提供兼容协议与工程化概率组合，不承诺与 Jev 模型完全一致。

## NPM 包

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

完整类型与 HTTP 契约见 [docs/api.md](docs/api.md)。

## WebUI

打开 GitHub Pages:

```text
https://lenml.github.io/deep-jev-seek/
```

浏览器直接调用 DeepSeek Beta FIM API。API Key 默认保存在当前标签页的 `sessionStorage`；只有显式选择“This browser”后才使用 `localStorage`。项目不代理或托管 Key。

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

请求：

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

请求 Bearer Key 优先于容器环境变量 `DEEPSEEK_API_KEY`。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm stats
```

`pnpm stats` 按单文件行数或字符数输出代码规模。默认将 250 行以上文件标记为 `OVER`；CI 使用 `pnpm stats:check` 阻止超长文件回归。

目录：

```text
apps/web/           React + Zustand + Shadcn WebUI
apps/server/        Bun HTTP 服务
packages/jevseek/   NPM 核心包
docs/               协议、设计与发布文档
```

发布说明见 [docs/release.md](docs/release.md)，实施设计见 [docs/dev/jevseek-design.md](docs/dev/jevseek-design.md)。

## 限制

- DeepSeek FIM 单次最多返回 20 个 top logprobs，因此首版单个 choice 问题最多 20 个候选。
- 每个问题独立请求一次，问题越多，延迟和成本线性增加。
- 浏览器直连依赖 DeepSeek 的 CORS 与用户本地网络。
- 不提供 API Key 托管、流式输出、批处理或 Jev 官方校准参数。
