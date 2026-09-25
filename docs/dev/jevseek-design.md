# JevSeek 实施设计

## 1. 目标

`@lenml/jevseek` 提供接近 TypeSafe Jev SystemOne 的 API：接收 `state` 与 `questions`，返回 `answers` 与 `usage`。底层通过 DeepSeek FIM 或 llama.cpp Completion API 获取每个候选答案的 token logprob，再转换为 Jev 风格的 choice、score、noul 响应。

还包含：

1. 纯前端 GitHub Pages WebUI，浏览器直连 DeepSeek 或 llama.cpp。
2. Bun HTTP 服务及 Docker / GHCR 镜像，接收 Jev 风格请求并转换到 DeepSeek。

## 2. 来源

- Jev API: <https://learnjev.com/reference>
- DeepSeek FIM: <https://api-docs.deepseek.com/zh-cn/api/create-completion/>
- DeepSeek FIM 指南: <https://api-docs.deepseek.com/zh-cn/guides/fim_completion/>
- llama.cpp server: <https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md>

调研时的关键事实：

- Jev 端点：`POST /v1/systemone`，另有模型列表。
- Jev 请求：`state`、`model`、`questions`。
- Jev answer 类型：
  - `choice`: `choice`, `probabilities`, `confidence`
  - `score`: `score`, `legend`, `probabilities`, `confidence`
  - `noul`: `noul`，没有 `confidence`
- DeepSeek FIM 端点：`POST /beta/completions`。
- DeepSeek FIM 模型：`deepseek-flash`、`deepseek-v4-pro`。
- DeepSeek FIM 支持 `prompt`、可选 `suffix`、`max_tokens`、`temperature`、`top_p`、`logprobs`。
- `logprobs` 最大为 20；返回 token 排序候选，可用于分类概率归一化。
- DeepSeek API 对 `https://lenml.github.io` 的浏览器 CORS 预检返回允许，因此 WebUI 可直接调用。WebUI 只把 Key 保存在用户浏览器中。

## 3. 协议映射

核心公开调用：

```ts
const client = createJevSeek({
  apiKey: "...",
  model: "deepseek-flash",
});

const result = await client.systemOne({
  state,
  questions,
});
```

每个问题独立请求一次 DeepSeek。问题 key 只用于组装响应，不发送给 DeepSeek，与 Jev 文档中「key is not sent to the model」的语义一致，也避免 key 名影响模型判断。

### 3.1 Prompt

默认结构：

```text
Classify by description.
State:
{...}

Question: {...}

Options:
- A = ...
- B = ...
- C = ...

Answer: \boxed{
```

默认模板按 provider 分离。DeepSeek 使用 `function selectOption()` 补全结构，避免模型直接输出选项内容；llama.cpp 使用 `候选码 = 描述` 和 `Answer: \boxed{`。两者都按 completion 语义编写，不使用聊天式角色口吻。内置 `{{instructions}}` 和 `{{options}}` 便于自定义模板直接使用可读字段；`{{question}}` 继续提供 code-mapped JSON。

JevBench Easy 公开集在本地 llama.cpp completion 端点复测：原序 48/48；choice 原序、逆序、轮转各三轮共 360/360，每题三种顺序全部稳定。该结果用于模板回归，不代表其他模型的绝对准确率。

候选 logprob 缺失时，客户端会使用严格候选码模板重试。严格重试仍失败时，默认返回全 0 概率并保留诊断；`missingLogprobPolicy: "error"` 可恢复抛错。

状态序列化保持稳定：对象 key 排序，避免等价状态因 JS 属性顺序变化导致缓存与结果不稳定。

模板可通过 `createJevSeek({ promptTemplate, fallbackPromptTemplate })` 或 `systemOne({ promptTemplate, fallbackPromptTemplate })` 覆盖。字符串模板支持 `{{state}}`、`{{question}}`、`{{instructions}}`、`{{options}}`、`{{questionType}}`、`{{codes}}`；函数模板可读取结构化上下文并返回完整 prompt。请求级设置优先于客户端级设置。

`instructions` 支持 `string | object | array`。对象和数组原样 JSON 序列化。`criteria` 同样进入 question JSON。

### 3.2 候选编码

- `choice`：按 criteria entry 顺序生成 `A`、`B`、`C` 等代码。
- `score`：按 criteria 层级顺序生成 `0`、`1`、`2` 等代码。
- `noul`：`0` 表示 false，`1` 表示 true。

`questions` 至少包含一个问题。`choice` 支持 1–20 项，key 和描述必须非空；描述为 `null` 时使用 key。`score` 支持 1–10 项，每项必须为非空字符串。`noul` 的 false/true 描述可选，提供时必须非空。

只有 1 个候选的 `choice`、`score` 不需要模型判断。客户端直接返回 one-hot 概率、置信度 `1` 和 usage `0`，不调用 transport。零选项、空标签和空 `questions` 在请求前抛出校验错误。

当前每个问题单次最多使用 20 个可见候选。Jev 的 choice 文档允许 255 个候选，但 DeepSeek 单次最多返回 20 个 logprob 候选，超过该数量无法得到可靠的统一概率分布。

若要完整支持 255 个 choice，需要增加分组分类和校准方案；超过 20 个候选不能静默截断。

### 3.3 DeepSeek 请求

```json
{
  "model": "deepseek-flash",
  "prompt": "<prompt above>",
  "max_tokens": 1,
  "temperature": 0,
  "top_p": 1,
  "logprobs": 20,
  "stream": false
}
```

`temperature: 0` 用于降低输出采样波动；概率仍来自 logprobs，不依赖 sampled token 本身。若调用方显式设置 provider options，可覆盖默认参数。

### 3.3.1 llama.cpp 请求

当 `provider: "llamacpp"` 时，transport 请求 llama.cpp 原生 `POST /completion`：

```json
{
  "model": "local-model",
  "prompt": "<prompt above>",
  "n_predict": 1,
  "temperature": 0,
  "top_p": 1,
  "n_probs": 20,
  "stream": false
}
```

`baseUrl` 默认是 `http://127.0.0.1:8080/v1`。transport 会移除末尾 `/v1`，因为 `/completion` 不在 OpenAI 兼容命名空间下。

响应从 `completion_probabilities[0]` 读取 sampled token 与 `top_logprobs[*].logprob`，再映射到统一 `DeepSeekLogprobs` 结构。`tokens_evaluated` 与 `tokens_predicted` 映射为 usage。

### 3.3.2 multimodal_data

`multimodal_data` 只允许 llama.cpp provider。transport 将 prompt 包装为：

```json
{
  "prompt_string": "<prompt above>",
  "multimodal_data": ["<base64-data>"]
}
```

prompt 中必须有同等数量的服务器媒体标记。模型需要加载 mmproj。DeepSeek provider 在发送请求前拒绝该字段。

### 3.4 响应解析

兼容 DeepSeek legacy completion logprobs：

```ts
type CompletionResponse = {
  choices?: Array<{
    text?: string;
    logprobs?: {
      tokens?: string[];
      token_logprobs?: number[];
      top_logprobs?: Array<Record<string, number>>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: { cached_tokens?: number };
  };
};
```

解析步骤：

1. 读取首个 choice。
2. 合并 `top_logprobs[0]` 与 sampled token / token_logprob。
3. token trim，并只保留当前候选代码。
4. 缺失候选初始 logprob 为 `-30`。
5. 同一 token 重复时取最大值。
6. 按 log-softmax 归一化。
7. 若没有候选，抛出解析错误。
8. 若完全无 logprobs，只允许 sampled text 是唯一合法候选时返回 one-hot。

### 3.5 confidence

choice 与 score 使用：

```text
confidence = (maxProbability - 1 / candidateCount)
           / (1 - 1 / candidateCount)
```

结果 clamp 到 `[0, 1]`。单个候选时 confidence 为 1。noul 不返回 confidence。

### 3.6 score

```text
score = Σ(index * probability[index])
legend = { "0": criteria[0], "1": criteria[1], ... }
```

## 4. npm 包结构

```text
packages/jevseek/
  src/
    client.ts
    errors.ts
    index.ts
    logprobs.ts
    prompt.ts
    types.ts
  test/
    client.test.ts
    logprobs.test.ts
    prompt.test.ts
```

公开导出：

- `createJevSeek`
- `JevSeekClient`
- 全部请求、响应、问题、诊断与配置类型
- `JevSeekError` 及各错误子类
- prompt、logprob、回答编码工具，便于复用和测试

运行时仅依赖浏览器/Node 原生 `fetch`，同时允许注入 `fetch`，可用于 Bun、Worker、Node 与前端。

## 5. 服务端

```text
apps/server/
  src/
    app.ts
    index.ts
```

路由：

- `GET /`
- `GET /healthz`
- `GET /v1/models`
- `POST /v1/systemone`

API Key 优先读取请求 `Authorization: Bearer ...`，其次读取 `DEEPSEEK_API_KEY`。响应不记录或回显 Authorization。

模型别名：

- `jev-latest` / `jev-preview` -> `DEEPSEEK_MODEL`，默认 `deepseek-flash`
- `deepseek-flash`
- `deepseek-v4-pro`

## 6. WebUI

技术栈：React、TypeScript、Vite、Zustand、Tailwind CSS、Shadcn 风格组件。

核心能力：

- 配置 DeepSeek 或 llama.cpp provider、Base URL、模型与 API Key。
- Playground 提供 noul、choice、score 表单预设和 JSON 编辑，展示 answers、usage、概率、原始请求与响应。
- Benchmark 支持内置数据集、外部 URL、内存缓存、概率视图、耗时统计和 JSON/CSV 导出。
- Batch 支持 CSV、JSONL、JSON 数组导入，公共 Prompt、可编辑行列和批量概率评估。
- Key 可保存到 `sessionStorage` 或 `localStorage`，并在界面中明确选择。
- prompt 模板可编辑、重置并持久化。
- 界面支持 English、简体中文、日本語、한국어。
- 请求完全在浏览器内发起，不经过项目服务器。

## 7. Docker / CI

镜像：

```text
ghcr.io/<owner>/<repo>:latest
ghcr.io/<owner>/<repo>:<sha>
```

工作流：

- `ci.yml`: install、test、typecheck、build。
- `pages.yml`: 构建 WebUI 并发布 GitHub Pages。
- `docker.yml`: 构建并推送 GHCR 镜像。

## 8. 错误与重试

核心错误按 HTTP 语义分类：

- 400 / 422：请求错误，不重试。
- 401 / 403：鉴权错误，不重试。
- 408、429、500、502、503、504：可重试。
- 网络异常：可重试。
- 响应结构错误：可重试一次，连续失败则抛出解析错误。

退避采用指数退避加随机抖动；响应包含 `Retry-After` 时优先使用。

## 9. 已知限制

- DeepSeek FIM 不等于 Jev 原始模型，概率分布与语义校准不会完全一致。
- DeepSeek FIM logprobs 只提供 top N，单次最多 20。
- 每个问题一次请求，问题多时成本线性增长。
- 浏览器直连 DeepSeek 依赖上游 CORS 与浏览器网络环境。
- 服务端 API 不支持流式输出或 255 choice 的完整概率恢复。
- WebUI 的 Key 由调用方自带，只保存在浏览器。

## 10. 验收标准

- `pnpm test` 全部通过。
- `pnpm typecheck` 全部通过。
- `pnpm build` 全部通过。
- mock fetch 覆盖 choice、score、noul、logprob、重试、错误。
- Bun 服务可返回 Jev 形状响应。
- WebUI 可使用 mock / 用户 Key 调用。
- GitHub Actions 可构建 Pages 与 Docker 镜像。
