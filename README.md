# Deep Jev Seek

[![CI](https://github.com/lenML/deep-jev-seek/actions/workflows/ci.yml/badge.svg)](https://github.com/lenML/deep-jev-seek/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@lenml/jevseek.svg)](https://www.npmjs.com/package/@lenml/jevseek)
[![npm downloads](https://img.shields.io/npm/dm/@lenml/jevseek.svg)](https://www.npmjs.com/package/@lenml/jevseek)
[![Docker](https://github.com/lenML/deep-jev-seek/actions/workflows/docker.yml/badge.svg)](https://github.com/lenML/deep-jev-seek/actions/workflows/docker.yml)
[![license](https://img.shields.io/npm/l/@lenml/jevseek.svg)](https://github.com/lenML/deep-jev-seek/blob/main/LICENSE)

![JevSeek WebUI](docs/assets/readme-banner.webp)

用 DeepSeek FIM 或 llama.cpp Completion API 提供 Jev / TypeSafe SystemOne 风格的离散决策接口。

项目包含三个部分：

- `@lenml/jevseek`：TypeScript npm 核心包。
- React WebUI：纯浏览器工作台，可连接 DeepSeek 或 llama.cpp。
- Bun Docker 镜像：接收 Jev 风格 HTTP 请求，返回 Jev 风格结果。

## 请求流程

每个 choice、score 或 noul 问题都会生成一次 completion 请求。模型只输出候选码，JevSeek 读取候选 token 概率，归一化后生成 choice、score 或 noul 答案。

- DeepSeek 模式：请求 `/beta/completions`，读取 `top_logprobs`。
- llama.cpp 模式：请求原生 `/completion`，读取 `n_probs`。

返回的是语言模型 token 概率。这类概率与 Jev 原始权重、官方校准概率不同。JevSeek 提供兼容协议和概率归一化，结果可能与 Jev 模型存在差异。

## npm 包

```bash
pnpm add @lenml/jevseek
```

支持 Node.js 18+、Bun、Workers 与浏览器。客户端提供超时、`AbortSignal`、指数退避、`Retry-After`、并发限制、可注入 `fetch` 或 transport，以及含 prompt、概率、usage 和 request ID 的 debug 诊断。

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

响应缺少候选 logprob 时，客户端自动使用严格候选码模板 `DEFAULT_FALLBACK_PROMPT_TEMPLATE` 重试。严格重试仍失败时，默认 `missingLogprobPolicy: "zero"` 返回全 0 概率和 0 置信度；设为 `"error"` 可保留报错。该配置可在客户端创建时设置，也可在单次 `systemOne` 请求中覆盖。

请求级覆盖：

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
```

在本地 llama.cpp 上，可用 JevBench Easy 公开集复测模板：

```bash
pnpm prompt:benchmark
```

类型和 HTTP 契约见 [docs/api.md](docs/api.md)。

## WebUI

线上地址：

```text
https://lenml.github.io/deep-jev-seek/
```

浏览器可直接连接 DeepSeek 或 llama.cpp。DeepSeek API Key 默认保存在当前标签页的 `sessionStorage`；选择「当前浏览器」后改用 `localStorage`。请求直接从浏览器发往配置的 provider，项目服务端不代理请求，也不保存 Key。

- `Playground`：按 `noul`、`choice`、`score` 三类预设填写表单，也可直接编辑 JSON；支持修改 prompt 模板、预览 prompt、查看原始请求与响应。
- `Benchmark`：内置 MMLU-Pro validation、JevBench Easy / Hard / Original，也支持外部 URL 与常见 JSON、JSONL、CSV、TSV、Hugging Face rows 格式。数据集缓存在内存中，结果支持概率进度条、题目耗时、卡片/表格视图、动态列数与 JSON/CSV 导出。
- `Batch`：从 CSV、JSONL、JSON 数组或文本框导入；提供公共 prompt、可编辑列头与行 prompt、概率单元格、最高分高亮，以及添加或删除行列、重跑和清空分数。
- `llama.cpp`：表单增加图片上传，自动生成 `multimodal_data` base64 数组，也可在 Base64 JSON 区域手动修改。

Playground、Benchmark、Batch 使用 hash 路由，地址分别为 `#/playground`、`#/benchmark`、`#/batch`，支持直达链接与浏览器前进后退。界面支持 English、简体中文、日本語、한국어，首次访问按浏览器语言自动选择；固定语言后 URL 会带 `?lang=en|zh|ja|ko`，方便分享。

本地开发：

```bash
pnpm install
pnpm --filter @lenml/jevseek build
pnpm --filter @lenml/jevseek-web dev
```

## Docker

镜像由 GitHub Actions 发布到 GHCR。服务提供以下端点：

| 端点                 | 说明                                                            |
| -------------------- | --------------------------------------------------------------- |
| `GET /`              | 服务名、版本、当前 provider 和端点列表                          |
| `GET /healthz`       | 健康检查                                                        |
| `GET /v1/models`     | 当前 provider 可用模型，包含 `jev-latest` 和 `jev-preview` 别名 |
| `POST /v1/systemone` | Jev 风格决策请求                                                |

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

Linux 下按 Docker 网络配置替换 `LLAMACPP_BASE_URL`。常用环境变量：

| 变量                | 默认值                          | 说明                                  |
| ------------------- | ------------------------------- | ------------------------------------- |
| `HOST`              | `0.0.0.0`                       | 监听地址                              |
| `PORT`              | `8787`                          | 监听端口                              |
| `JEVSEEK_PROVIDER`  | `deepseek`                      | `deepseek` 或 `llamacpp`              |
| `DEEPSEEK_API_KEY`  | 无                              | DeepSeek 模式默认 Key；无请求头时使用 |
| `DEEPSEEK_MODEL`    | `deepseek-flash`                | 模型别名映射目标                      |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com/beta` | DeepSeek FIM 地址                     |
| `LLAMACPP_API_KEY`  | 无                              | llama.cpp 需要鉴权时设置              |
| `LLAMACPP_MODEL`    | `llamacpp`                      | 模型别名映射目标                      |
| `LLAMACPP_BASE_URL` | `http://127.0.0.1:8080/v1`      | llama.cpp 服务地址                    |
| `MAX_BODY_BYTES`    | `1048576`                       | JSON 请求体上限                       |

HTTP 请求可覆盖 `model`、`promptTemplate`、`missingLogprobPolicy` 与 llama.cpp 的 `multimodal_data`。请求体格式、错误码和响应结构见 [docs/api.md](docs/api.md)。

## 开发命令

```bash
pnpm install
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm stats
pnpm stats:check
```

`pnpm stats` 按单文件行数或字符数输出代码规模，`pnpm stats --sort chars` 按字符数排序。默认将 250 行以上的文件标记为 `OVER`；CI 用 `pnpm stats:check` 检查超长文件。

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
- 不提供 API Key 托管、流式输出、服务端批量作业调度或 Jev 官方校准参数。
