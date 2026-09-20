# DeepSeek JEV-style SystemOne NPM 包设计与实现文档

## 1. 文档目标

本文描述如何把当前 Python 项目里的 DeepSeek 决策能力独立封装成一个 TypeScript/NPM 包，供其他 Node.js 或服务端项目复用。

当前参考实现主要位于：

- `snake_lab/deepseek_controller.py`：DeepSeek Chat Completions 调用、logprobs 读取、并发与诊断。
- `snake_lab/systemone.py`：SystemOne 问题格式、候选选项解析、置信度与校准。
- `snake_lab/atomic.py`：贪吃蛇原子问题生成、概率组合、最终动作选择。
- `snake_lab/model_service.py`：HTTP 服务、模型加载生命周期、`/v1/systemone` 和 `/v1/systemone/debug`。
- `snake_lab/remote.py`：客户端调用、atomic 模式组合、调试信息返回。

核心结论：

> DeepSeek 并不直接运行 JEV 权重。这里所谓“用 DeepSeek 模拟 JEV”，本质是把一个决策问题拆成若干简单的 SystemOne 选择问题，让 DeepSeek 只输出候选选项码，再用 `top_logprobs` 得到候选概率，最后由确定性代码组合这些概率得到最终答案。

NPM 包不应把“贪吃蛇逻辑”和“DeepSeek 分类能力”绑死。推荐分成两层：

1. 通用核心包：调用 DeepSeek、构造问题、解析 logprobs、校准、并发、重试、缓存、诊断。
2. 领域适配器：把具体状态转换成问题，并把回答组合成业务决策，例如贪吃蛇的 wall/body/food 原子问题。

---

## 2. 能力边界

### 2.1 这个包能做什么

- 把任意离散选择问题转为 DeepSeek 的首 token 分类问题。
- 通过 `logprobs` / `top_logprobs` 获取候选选项的相对概率。
- 支持 `choice`、`score`、`noul` 等 SystemOne 风格问题。
- 支持多个问题并发调用。
- 支持 per-question temperature/bias 校准。
- 支持置信度归一化、诊断信息、token usage 统计。
- 支持把多个原子问题组合成业务决策。
- 可作为本地模型、其他 OpenAI-compatible provider 的统一接口实现。

### 2.2 这个包不做什么

- 不承诺获得 DeepSeek 隐藏层的真实 softmax。
- 不承诺 DeepSeek 输出是数学意义上严格校准的概率。
- 不把 API Key 安全地暴露给浏览器。NPM 包应主要面向 Node.js、服务端、Worker、Electron main process。
- 不负责业务规则本身。例如“撞墙概率大于 0.5 就禁止某动作”属于 domain adapter。
- 不依赖 JEV 原始模型权重。

---

## 3. JEV-Style 原理

### 3.1 JEV 的关键不是“让模型直接选动作”

JEV 思路强调：

1. 把复杂任务拆成更小的判断。
2. 每个判断只回答局部事实。
3. 输出离散选项，而不是自由文本。
4. 让模型输出概率或可比较分数。
5. 用外部算法组合局部判断。
6. 置信度应尽量满足“高置信度对应高准确率”。

对于贪吃蛇：

- 复杂问题：直接让模型看棋盘并选择上/下/左/右。
- JEV-style 问题：分别判断 `turn_left`、`straight`、`turn_right` 的三个局部事实。
- 局部事实：`wall`、`body`、`food`。
- 原子问题数量：`3 × 3 = 9`。
- 每个原子问题只回答 `yes/no`，对应代码 `A/B`。
- 组合器读取 9 个概率，得到三个动作的碰撞风险与食物进展。
- 最后选择动作。

这使模型不需要在一次生成中完成复杂推理，也避免解析自由文本。

### 3.2 为什么可以用 logprobs 做分类

OpenAI-compatible Chat Completions 通常可返回：

```json
{
  "choices": [
    {
      "message": { "content": "A" },
      "logprobs": {
        "content": [
          {
            "token": "A",
            "logprob": -0.12,
            "top_logprobs": [
              { "token": "A", "logprob": -0.12 },
              { "token": "B", "logprob": -2.31 },
              { "token": "C", "logprob": -3.77 }
            ]
          }
        ]
      }
    }
  ]
}
```

模型生成首 token 时，候选选项的概率可由 logprob 转回：

```text
p_i = exp(logprob_i) / sum_j exp(logprob_j)
```

为了数值稳定，先减去最大值：

```text
m = max(logprob_i)
w_i = exp(logprob_i - m)
p_i = w_i / sum_j w_j
```

这只表示“候选选项 token 在模型分布中的相对权重”，不等价于模型对业务事实的真实校准概率。

### 3.3 为什么只取首 token

设计目标是让模型只生成一个标签：

```text
Answer: A
```

因此必须：

- 将 `max_tokens` 限制为 `1`。
- 强制模型只输出候选选项码。
- 禁止解释和思维链。
- 将 `A/B/C/D` 等标签作为候选 token 解析。
- 不给模型自然语言输出空间。

这样可以避免：

- JSON 解析失败。
- 模型输出解释。
- 多 token 标签。
- 输出格式漂移。
- 输出正文覆盖概率信息。

### 3.4 JEV-style 置信度

不能简单把最高概率当作 JEV 置信度。

对于 `n` 个候选：

```text
confidence = (p_max - 1/n) / (1 - 1/n)
```

含义：

- all candidates equal：置信度为 0。
- p_max = 1：置信度为 1。
- n = 1：置信度为 1，因为没有不确定性。

分数型问题通常计算概率分布相对众数层的距离，再转换为置信度。

### 3.5 概率校准

DeepSeek 返回的概率可能过度自信或不足自信。校准层使用 per-question 参数：

```text
logit(p) = ln(p / (1 - p))

scaled_logit = logit(p) / temperature + bias[question_id]

p_calibrated = sigmoid(scaled_logit)
```

参数：

- `temperature > 0`：控制整体概率缩放。
- `bias[question_id]`：修正某个问题的系统性偏差。
- `sample_count`：校准样本数量。
- `nll_before`、`nll_after`：拟合前后负对数似然。

校准参数应该按模型 ID、问题模板版本、provider 分开保存。模型或 prompt 变化后，旧校准不应自动沿用。

---

## 4. 当前实现链路

### 4.1 贪吃蛇 atomic 模式

```text
Snake observation
    |
    v
build_atomic_state()
    |
    |-- current_heading
    |-- turn_left/straight/turn_right
    |-- moves_before_wall
    |-- body_distance_moves
    |-- food_offset_moves
    v
build_atomic_questions()
    |
    |-- 9 个 A/B choice 问题
    v
DeepSeekController.score()
    |
    |-- ThreadPoolExecutor
    |-- 每问一次 /chat/completions
    |-- 读取 top_logprobs
    v
parse_candidate_logprobs()
    |
    |-- 只保留候选码
    |-- logprob -> normalized probability
    v
apply_calibration()
    |
    v
compose_atomic_decision()
    |
    |-- wall probability
    |-- body probability
    |-- food probability
    |-- collision risk
    |-- clear action
    |-- final action
    v
move
```

### 4.2 当前 API 调用次数

Atomic 模式每一步需要 9 次 DeepSeek 请求：

```text
3 relative actions × (wall + body + food) = 9 requests
```

默认 `workers=4`。假设单局 6 Hz、每步 9 次：

```text
6 × 9 = 54 requests/s/game
```

这会造成：

- API 费用高。
- 429 限速概率高。
- 延迟波动大。
- 多局并行时请求量成倍增加。

因此 NPM 包必须把并发控制和限速作为一级能力，而不是后补功能。

---

## 5. NPM 包总体架构

推荐名称占位：

```text
@your-scope/deepseek-systemone
```

推荐分层：

```text
+-------------------------------------------------------+
| Public API                                            |
| createDeepSeekSystemOne(), classify(), classifyMany() |
+-------------------------------------------------------+
| SystemOne Orchestrator                                |
| question validation, call scheduling, answer assembly |
+-------------------------------------------------------+
| Prompt + Codec                                        |
| prompt builder, option codec, logprob parser, calibrator |
+-------------------------------------------------------+
| Transport                                             |
| fetch/undici, timeout, abort, retry, proxy, rate limit |
+-------------------------------------------------------+
| Provider Adapters                                     |
| DeepSeek, OpenAI-compatible, custom injectable client  |
+-------------------------------------------------------+
| Domain Adapters                                       |
| snake atomic composer, application-specific rules      |
+-------------------------------------------------------+
```

依赖方向必须单向：

```text
domain adapter -> core -> transport -> provider
```

Core 不能依赖 snake adapter。Snake adapter 可以依赖 core。

---

## 6. 公开 API 设计

### 6.1 基础类型

```ts
export type QuestionType = "choice" | "score" | "noul";

export interface ChoiceQuestion {
  type: "choice";
  instructions: string;
  criteria: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface ScoreQuestion {
  type: "score";
  instructions: string;
  criteria: string[];
  metadata?: Record<string, unknown>;
}

export interface NoulQuestion {
  type: "noul";
  instructions: string;
  criteria?: {
    false?: string;
    true?: string;
  };
  metadata?: Record<string, unknown>;
}

export type SystemOneQuestion = ChoiceQuestion | ScoreQuestion | NoulQuestion;

export type QuestionSet = Record<string, SystemOneQuestion>;
```

### 6.2 客户端创建

```ts
import { createDeepSeekSystemOne } from "@your-scope/deepseek-systemone";

const client = createDeepSeekSystemOne({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  model: "deepseek-chat",
  baseUrl: "https://api.deepseek.com",
  timeoutMs: 90_000,
  concurrency: 4,
  retry: {
    maxAttempts: 3,
    baseDelayMs: 300,
    maxDelayMs: 5_000,
    jitter: true,
  },
});
```

### 6.3 单个决策

```ts
const result = await client.score({
  state,
  questions,
  debug: false,
});

console.log(result.answers);
console.log(result.usage);
```

### 6.4 带诊断的决策

```ts
const result = await client.score({
  state,
  questions,
  debug: true,
});

console.dir(result.diagnostics, { depth: null });
```

### 6.5 注入自定义 transport

```ts
export interface ChatLogprobTransport {
  complete(request: ChatLogprobRequest): Promise<ChatLogprobResponse>;
}

const client = createDeepSeekSystemOne({
  transport: customTransport,
  model: "my-proxy-model",
});
```

这样可以：

- 测试时替换 mock transport。
- 接入企业代理。
- 接入其他 OpenAI-compatible provider。
- 在后端服务里统一加审计、限流、缓存。

---

## 7. Core 接口建议

### 7.1 Transport 接口

```ts
export interface ChatLogprobRequest {
  model: string;
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
  maxTokens: 1;
  temperature: number;
  topP: number;
  logprobs: true;
  topLogprobs: number;
  providerOptions?: Record<string, unknown>;
}

export interface TopLogprob {
  token: string;
  logprob: number;
}

export interface ChatLogprobResponse {
  content: string;
  topLogprobs: TopLogprob[];
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
  };
  requestId?: string;
}
```

### 7.2 Domain Adapter 接口

```ts
export interface DecisionAdapter<TState, TDecision> {
  buildQuestions(state: TState): QuestionSet;
  compose(
    state: TState,
    answers: Record<string, SystemOneAnswer>,
    diagnostics?: SystemOneDiagnostics
  ): TDecision;
}
```

Snake adapter：

```ts
export interface SnakeState {
  gridSize: number;
  head: [number, number];
  direction: "up" | "right" | "down" | "left";
  snake: Array<[number, number]>;
  food: [number, number];
  walls: Array<[number, number]>;
}

export interface SnakeDecision {
  action: "turn_left" | "straight" | "turn_right";
  probabilities: Record<string, number>;
  confidence: number;
  assessments: Record<string, unknown>;
  reason: string;
}
```

---

## 8. Prompt 设计

### 8.1 Prompt 必须满足的条件

- 明确说明只返回一个选项码。
- 明确列出每个选项的含义。
- 问题和状态使用稳定 JSON 结构。
- 不要求模型解释。
- 不要求模型输出 JSON。
- 不要求模型输出自然语言标签。
- 候选码限制为 ASCII `A-T`。
- 候选数量不超过 20。
- 每个问题的语义独立，不能要求跨问题推理。

### 8.2 推荐 Prompt 模板

```text
Evaluate the state using the question and labeled options that follow.
Return only the option code. Do not explain or reason aloud.

State:
{"current_heading":"right","directions":{...}}

Question: {"type":"choice","instructions":"Move straight: does moves_before_wall equal 0?","options":[{"code":"A","option":"yes","description":"yes"},{"code":"B","option":"no","description":"no"}]}
Answer:
```

稳定前缀和变量后缀应分开：

```text
Stable prefix:
System instruction + state

Variable suffix:
single question + Answer:
```

这样有利于 provider 的前缀缓存，提高 `cached_tokens` 命中率。

### 8.3 为什么不让模型直接输出 JSON

JSON 输出需要多 token 生成：

- 首 token 概率不再直接对应单个选项。
- 解析复杂度上升。
- 模型可能返回 markdown code fence。
- 模型可能在 JSON 中解释。
- `max_tokens=1` 无法容纳完整 JSON。

因此首选单 token 选项码。

---

## 9. DeepSeek 请求实现

### 9.1 HTTP 请求

```http
POST /chat/completions
Authorization: Bearer <DEEPSEEK_API_KEY>
Content-Type: application/json
```

请求体：

```json
{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "system",
      "content": "Return only the option code. Do not explain."
    },
    {
      "role": "user",
      "content": "State:\n...\nQuestion: ...\nAnswer:"
    }
  ],
  "max_tokens": 1,
  "temperature": 1,
  "top_p": 1,
  "stream": false,
  "logprobs": true,
  "top_logprobs": 2
}
```

### 9.2 Provider-specific 参数

不要把这些参数写死在 core：

- `thinking`
- `reasoning_effort`
- 私有路由字段
- 代理鉴权字段
- 企业网关 header

统一放在：

```ts
providerOptions: {
  thinking: { type: "disabled" },
  headers: {
    "x-tenant-id": tenantId,
  },
}
```

模型名也必须配置化。参考实现使用 `deepseek-flash`、`deepseek-v4-pro`，但 NPM 包不应假设这些名称对所有 endpoint 有效。

---

## 10. 响应解析

### 10.1 兼容字段

建议支持以下形态：

```ts
type OpenAIChatResponse = {
  choices?: Array<{
    message?: { content?: string | null };
    logprobs?: {
      content?: Array<{
        token?: string;
        logprob?: number;
        top_logprobs?: Array<{
          token?: string;
          logprob?: number;
        }>;
      }>;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    prompt_tokens_details?: {
      cached_tokens?: number;
    };
  };
};
```

### 10.2 解析规则

1. 取 `choices[0]`。
2. 取首 token content。
3. 取 `choices[0].logprobs.content[0].top_logprobs`。
4. token 去空白、转大写。
5. 只保留候选码。
6. 候选码初始 logprob 设为 `-30`。
7. 同一 token 重复出现时取最大值。
8. 做 log-softmax 归一化。
9. 若没有 `top_logprobs`：
   - content 是合法候选码时使用 one-hot。
   - content 非法时抛错。
10. 有 `top_logprobs` 但没有任何候选码时抛错。

### 10.3 解析伪代码

```ts
function normalizeCandidateLogprobs(codes: string[], entries: TopLogprob[]) {
  const logits = new Map(codes.map((code) => [code, -30]));

  for (const entry of entries) {
    const token = entry.token.trim().toUpperCase();
    if (!logits.has(token)) continue;
    logits.set(token, Math.max(logits.get(token)!, entry.logprob));
  }

  const values = [...logits.values()];
  const max = Math.max(...values);
  const weights = values.map((value) => Math.exp(value - max));
  const total = weights.reduce((sum, value) => sum + value, 0);

  if (!Number.isFinite(total) || total <= 0) {
    throw new DeepSeekParseError("candidate probability mass is zero");
  }

  return Object.fromEntries(
    codes.map((code, index) => [code, weights[index] / total])
  );
}
```

---

## 11. SystemOne 答案编码

### 11.1 Choice

输入：

```json
{
  "type": "choice",
  "criteria": {
    "left": "Move left",
    "right": "Move right"
  }
}
```

映射：

```text
A -> left
B -> right
```

输出：

```ts
{
  type: "choice",
  choice: "left",
  probabilities: {
    left: 0.73,
    right: 0.27
  },
  confidence: 0.46
}
```

### 11.2 Score

候选层使用 `A/B/C/...`，输出加权分数：

```text
score = sum(index * probability[index])
```

### 11.3 Noul

Noul 使用：

```text
A = false
B = true
```

输出：

```ts
{
  type: "noul",
  noul: 0.82
}
```

---

## 12. Atomic 组合算法

### 12.1 输入

每个动作有三个概率：

```text
wall_yes
body_yes
food_yes
```

语义：

- `wall_yes`：该方向下一步是否撞墙。
- `body_yes`：该方向下一步是否撞身体。
- `food_yes`：该方向是否减少与食物的曼哈顿距离。

### 12.2 碰撞风险

```text
collision_risk = max(wall_yes, body_yes)
clear = wall_yes < 0.5 && body_yes < 0.5
```

### 12.3 首先选择安全动作

若存在 `clear=true`：

```text
按以下顺序选择：
1. food_progress 最大
2. collision_risk 最小
3. straight 优先
```

### 12.4 没有安全动作

若没有 `clear=true`：

```text
按以下顺序选择：
1. collision_risk 最小
2. food_progress 最大
3. straight 优先
```

### 12.5 概率化评分

参考实现使用：

```text
score =
  is_clear
  + 0.60 * food_progress
  + 0.20 * (1 - collision_risk)
  + 0.002 * is_straight
```

然后归一化三个动作的分数。这是一种工程化启发式，不是 JEV 官方定义。NPM 包应允许业务侧替换 composer。

---

## 13. 并发、限速与重试

### 13.1 并发控制

默认：

```ts
concurrency: 4;
```

上限建议：

```ts
concurrency: Math.min(userValue, 8);
```

并发单位是“一个 atomic question 一次 HTTP 请求”，不是“一个游戏一步”。

### 13.2 限速

需要支持两层限制：

1. requests per minute。
2. input/output tokens per minute。

推荐 token bucket：

```ts
interface RateLimitConfig {
  requestsPerMinute?: number;
  tokensPerMinute?: number;
  burst?: number;
}
```

单进程内用队列即可。多进程、多容器场景必须使用 Redis 或网关级共享限流。

### 13.3 重试

建议重试：

- HTTP 408。
- HTTP 429。
- HTTP 500、502、503、504。
- 网络连接错误。
- 上游 200 但 JSON 暂时不完整或不可解析。

不要重试：

- HTTP 400 参数错误。
- 401 鉴权失败。
- 403 权限失败。
- 选项数量超过 20。
- 返回内容明确非法且不是瞬时错误。

退避：

```text
delay = min(maxDelay, baseDelay * 2^attempt) + randomJitter
```

若响应含 `Retry-After`，优先遵守。

### 13.4 超时与取消

需要支持：

```ts
AbortSignal;
connectTimeout;
readTimeout;
totalTimeout;
```

`fetch` 默认不区分连接与读取，若使用 `undici` 可更细粒度控制。至少必须支持总超时和 AbortSignal。

### 13.5 多线程/多请求安全

如果使用 Node.js `fetch`，不要共享可变请求状态。若使用 SDK/agent：

- 一个 HTTP client 可复用连接池。
- 不共享 request-specific headers。
- 不在 finally 中修改全局代理环境变量。
- 不依赖 `process.env.HTTP_PROXY` 的运行时切换。

代理应通过 transport 注入：

```ts
createDeepSeekSystemOne({
  proxyUrl: "http://proxy:7890",
});
```

---

## 14. 缓存策略

### 14.1 可缓存内容

可缓存：

- 相同 model、prompt、temperature、topP、provider options 的 logprob 结果。
- 相同问句和相同 state 的原子问题结果。
- 测试环境和确定性回放。

不可盲目缓存：

- 需要实时变化的业务状态。
- 含敏感数据的 prompt。
- 需要严格审计的请求。

### 14.2 Cache Key

```text
sha256(
  provider + "\n" +
  model + "\n" +
  prompt + "\n" +
  temperature + "\n" +
  topP + "\n" +
  optionCodes
)
```

### 14.3 TTL 与作用域

建议：

```ts
cache: {
  ttlMs: 30_000,
  maxEntries: 10_000,
  keyPrefix: tenantId,
}
```

高并发游戏场景可缓存同一状态下的 9 个问题结果，但状态变化后 key 必须变化。

### 14.4 Prompt Caching

DeepSeek 或兼容服务可能返回：

```json
"prompt_tokens_details": {
  "cached_tokens": 512
}
```

包应记录该字段，用于观察稳定前缀是否命中缓存。不要把它当业务正确性保证。

---

## 15. 错误模型

推荐错误基类：

```ts
export class SystemOneError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status?: number;
  readonly requestId?: string;
  readonly cause?: unknown;
}
```

子类：

```ts
DeepSeekAuthError;
DeepSeekRateLimitError;
DeepSeekTimeoutError;
DeepSeekTransportError;
DeepSeekResponseError;
DeepSeekParseError;
SystemOneValidationError;
CalibrationError;
```

错误返回应保留：

- provider。
- model。
- status。
- requestId。
- 重试次数。
- 是否 retryable。
- 脱敏后的上游错误信息。

绝不能输出：

- API Key。
- Authorization header。
- 完整 cookie。
- 未脱敏的敏感 state。

---

## 16. 诊断信息

建议每次 `score()` 返回：

```ts
export interface SystemOneDiagnostics {
  provider: string;
  model: string;
  questionCount: number;
  forwardCalls: number;
  parallelWorkers: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  latencyMs: number;
  retries: number;
  promptHash: string;
  rawAnswers?: Record<string, SystemOneAnswer>;
  calls?: Array<{
    questionId: string;
    attempt: number;
    status: number;
    latencyMs: number;
    requestId?: string;
    prompt?: string;
    topLogprobs?: TopLogprob[];
  }>;
  calibration?: CalibrationMetadata;
}
```

默认生产模式不返回完整 prompt。调试模式显式开启：

```ts
debug: true;
```

---

## 17. 校准数据与训练

### 17.1 数据格式

```ts
interface CalibrationSample {
  questionId: string;
  questionVersion: string;
  modelId: string;
  probability: number;
  groundTruth: boolean;
}
```

### 17.2 训练目标

对每个问题拟合：

```text
temperature > 0
bias[questionId]
```

目标函数：

```text
NLL =
  -sum(
    y * log(p_calibrated)
    + (1 - y) * log(1 - p_calibrated)
  )
```

可选正则：

```text
lambda * sum(bias^2)
```

防止小样本下某个问题的 bias 过拟合。

### 17.3 训练流程

1. 固定模型、prompt、问题模板。
2. 用固定 seed 收集 raw probability。
3. 记录 ground truth。
4. 按 question ID 分组。
5. 样本不足时只拟合全局 temperature。
6. 样本充足时拟合 temperature + per-question bias。
7. 在独立验证集检查 NLL、accuracy、ECE。
8. 保存 calibration JSON。
9. 模型或 prompt 变更后重新拟合。

### 17.4 校准文件版本

```json
{
  "version": 1,
  "modelId": "deepseek-chat",
  "questionSchemaVersion": "snake-atomic-v1",
  "temperature": 1.37,
  "biases": {
    "straight_wall": -0.42
  },
  "sampleCount": 240,
  "nllBefore": 0.71,
  "nllAfter": 0.63
}
```

---

## 18. 推荐目录结构

```text
deepseek-systemone/
  package.json
  tsconfig.json
  tsup.config.ts
  vitest.config.ts
  src/
    index.ts
    client.ts
    types.ts
    errors.ts
    prompt.ts
    codec.ts
    logprobs.ts
    calibration.ts
    systemone.ts
    transport/
      types.ts
      fetch-transport.ts
      deepseek-transport.ts
    reliability/
      concurrency.ts
      retry.ts
      rate-limit.ts
      cache.ts
    domain/
      atomic.ts
      snake/
        state.ts
        questions.ts
        composer.ts
    testing/
      fixtures.ts
      mock-transport.ts
  test/
    logprobs.test.ts
    prompt.test.ts
    systemone.test.ts
    calibration.test.ts
    transport.test.ts
    snake-atomic.test.ts
    rate-limit.test.ts
```

### 18.1 包构建建议

- 运行时：Node.js 18+。
- 模块：优先 ESM。
- 可选 CJS：若需要兼容旧 Node 项目，通过 `tsup` 双产物。
- 类型：生成 `.d.ts`。
- 校验：`zod` 仅用于外部输入边界，核心内部类型使用 TypeScript。
- HTTP：优先原生 `fetch`，Node 18 以下不承诺支持。
- 测试：`vitest` 或 `node:test`。
- 断言：mock transport，不把真实 API 放进默认 CI。

---

## 19. TypeScript 实现骨架

```ts
import {
  createDeepSeekTransport,
  type Calibration,
  type ChatLogprobTransport,
  type QuestionSet,
  type SystemOneResult,
  type Task,
  type CallResult,
} from "./types";

export interface DeepSeekSystemOneOptions {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  transport?: ChatLogprobTransport;
  concurrency?: number;
  timeoutMs?: number;
  retry?: RetryOptions;
  rateLimit?: RateLimitOptions;
  cache?: CacheOptions;
  calibration?: Calibration;
}

export class DeepSeekSystemOne {
  private readonly options: DeepSeekSystemOneOptions;
  private readonly transport: ChatLogprobTransport;
  private readonly calibration?: Calibration;

  constructor(options: DeepSeekSystemOneOptions) {
    this.options = options;
    this.transport = options.transport ?? createDeepSeekTransport(options);
    this.calibration = options.calibration;
  }

  async score(input: {
    state: unknown;
    questions: QuestionSet;
    debug?: boolean;
  }): Promise<SystemOneResult> {
    validateQuestions(input.questions);

    const tasks = Object.entries(input.questions).map(
      ([questionId, question]) => ({
        questionId,
        question,
        codes: getQuestionCodes(question),
      })
    );

    const calls = await runWithConcurrency(
      tasks,
      this.options.concurrency ?? 4,
      async (task) => this.completeQuestion(input.state, task)
    );

    const answers = Object.fromEntries(
      calls.map((call) => [call.questionId, call.answer])
    );

    return {
      model: this.options.model,
      answers,
      usage: sumUsage(calls),
      diagnostics: input.debug ? buildDiagnostics(calls) : undefined,
    };
  }

  private async completeQuestion(
    state: unknown,
    task: Task
  ): Promise<CallResult> {
    const prompt = buildPrompt(state, task.question, task.codes);

    const response = await this.transport.complete({
      model: this.options.model,
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      maxTokens: 1,
      temperature: 1,
      topP: 1,
      logprobs: true,
      topLogprobs: Math.min(20, task.codes.length),
    });

    const probabilities = parseCandidateLogprobs(
      task.codes,
      response.topLogprobs,
      response.content
    );

    const rawAnswer = answerFromCodes(task.question, probabilities, task.codes);

    const answer = applyCalibration(
      task.questionId,
      task.question,
      rawAnswer,
      this.calibration
    );

    return {
      questionId: task.questionId,
      answer,
      rawAnswer,
      usage: response.usage,
      prompt,
      requestId: response.requestId,
    };
  }
}
```

---

## 20. 测试策略

### 20.1 必需单元测试

- `A/B` token 归一化。
- 大小写和空白处理。
- 非候选 token 被丢弃。
- 没有任何候选 token 时抛错。
- 没有 `top_logprobs` 但 content 合法时 one-hot。
- 没有 `top_logprobs` 且 content 非法时抛错。
- 候选超过 20 时拒绝请求。
- choice 编码与原始 key 映射。
- score 加权。
- noul 布尔概率。
- confidence 不是 top probability。
- calibration 改变概率和 argmax。
- atomic 组合器安全动作优先。
- 无安全动作时最低风险选择。
- 重试仅覆盖允许错误。
- 429 尊重 Retry-After。
- 并发不超过上限。
- abort 能取消请求。
- cache key 包含全部相关参数。

### 20.2 集成测试

默认 CI：

```text
mock HTTP server
fixture response
```

可选手动测试：

```text
DEEPSEEK_API_KEY=... pnpm test:integration
```

集成测试必须：

- 显式 opt-in。
- 限制请求数量。
- 不跑高频贪吃蛇。
- 输出 token usage。
- 失败时保留 requestId，不输出 API key。

### 20.3 快照测试

对以下内容做 golden snapshot：

- prompt 模板。
- 请求 payload。
- 标准化 response。
- diagnostics 结构。
- calibration JSON。

---

## 21. 成本与性能估算

### 21.1 Atomic 模式成本

每步：

```text
input_tokens_per_decision ≈
  sum(question_i.prompt_tokens)

output_tokens_per_decision ≈ 9
```

由于每个问题重复 state，state 越长，成本放大越明显。

### 21.2 优化方向

1. 稳定系统提示放前缀。
2. state 放 question 之前。
3. 只把变化部分放在末尾。
4. 打开 provider prompt cache。
5. 避免重复请求完全相同的问题。
6. 对低价值问题减少候选。
7. 对多局共享同一状态的结果做内存缓存。
8. 使用网关级限流和熔断。
9. 在高频场景增加本地/规则 fallback。
10. 评估把多个问题合并为一次请求的可行性。

### 21.3 单请求多问题是否可行

可以研究，但不能作为默认核心：

- `top_logprobs` 通常只覆盖首 token。
- 多问题需要多个生成位置。
- 每个位置的候选空间会变大。
- 输出约束、解析和错误恢复更复杂。
- provider 不保证每个位置的 logprobs 形态一致。

只有在服务端有严格 constrained decoding 或能证明稳定性时，才建议提供 `batched` 模式。

---

## 22. 安全要求

- API Key 只存在于服务端环境变量或 secret manager。
- 不把 API Key 打进前端 bundle。
- 不把 API Key 写入日志。
- 诊断中不返回 `Authorization` header。
- 对 state 和时间戳做脱敏配置。
- 支持 `redactPrompt` 钩子。
- 多租户使用 tenant 作用域缓存。
- 若必须支持浏览器，提供 BFF 网关，不直接调用 DeepSeek。

---

## 23. 与现有 Python 项目的兼容策略

Python 端协议：

```json
{
  "model": "deepseek-v4-pro",
  "state": {},
  "questions": {}
}
```

NPM 包建议提供对应协议：

```ts
client.systemOne({
  model,
  state,
  questions,
});
```

如果 NPM 包承担模型服务角色，HTTP 路由可以保持：

```text
GET  /v1/models
POST /v1/models/load
POST /v1/models/unload
POST /v1/systemone
POST /v1/systemone/debug
```

但“模型加载/卸载”对 DeepSeek 只表示初始化客户端和检查 API Key，不代表加载 GPU 权重。该语义应在接口文档中明确。

---

## 24. 版本与演进

建议版本策略：

- `0.x`：API 可变动，优先验证 prompt、logprob 与 rate limit。
- `1.0`：稳定 core API。
- domain adapter 单独版本化。
- prompt schema 单独版本化。
- calibration 与 prompt schema 强绑定。

每次变更记录：

- provider。
- model。
- prompt schema。
- temperature。
- topP。
- logprob parser 版本。
- calibration 版本。

---

## 25. 实施路线图

### 阶段 1：核心协议

- 定义 types。
- 实现 DeepSeek transport。
- 实现 prompt builder。
- 实现 logprob parser。
- 实现 choice/score/noul codec。
- 加 mock transport 测试。

### 阶段 2：可靠性

- concurrency。
- rate limit。
- retry。
- timeout。
- abort。
- cache。
- diagnostics。

### 阶段 3：JEV-style 组合

- atomic question adapter。
- calibration。
- snake composer。
- raw/calibrated answer 对照。
- 指标统计。

### 阶段 4：服务化

- HTTP server adapter。
- `/v1/systemone`。
- `/v1/systemone/debug`。
- health、metrics、graceful shutdown。

### 阶段 5：生产验证

- 真实 DeepSeek 小样本测试。
- 429、超时、断网测试。
- 多局压力测试。
- 成本回归测试。
- 跨进程限流验证。

---

## 26. 验收标准

NPM 包达到可用状态时，应满足：

- `score()` 能返回归一化候选概率。
- 9 个 atomic 问题并发调用受限。
- 429 自动退避。
- 超时可取消。
- 非法响应不静默变成错误动作。
- 校准可加载、可验证、可追踪。
- debug 信息包含 token usage 和 requestId。
- 日志中无 API Key。
- 单元测试覆盖所有解析分支。
- CI 不依赖真实 DeepSeek 网络。
- 有显式 integration test。
- API 与领域 adapter 解耦。
- 贪吃蛇逻辑可替换为其他业务。

---

## 27. 关键设计结论

1. DeepSeek 提供的是 token logprob，不是直接提供 JEV 置信度。
2. JEV-style 的核心是问题分解、离散答案、概率归一化、确定性组合与校准。
3. 每个原子问题一次请求最可靠，但成本高，必须默认限流。
4. 候选码必须严格限制，首 token 必须是唯一选项码。
5. 置信度应使用“与均匀分布的距离”，不能简单使用 `max probability`。
6. 校准必须按模型、prompt schema 和 question ID 版本化。
7. 通用 core 与 snake domain 必须分离，否则 NPM 包无法复用。
8. 默认面向 Node.js 服务端，浏览器只能通过 BFF 间接调用。
9. 真实 API 集成测试必须显式开启，不能污染默认 CI 和费用。
10. 最终应提供两种输出：raw answer 与 calibrated answer，便于审计和回归比较。
