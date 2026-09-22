# DeepSeek MMLU-Pro 测试记录

日期：2026-09-23

测试对象：`@lenml/jevseek@0.1.1`

## 数据集

- 数据集：[TIGER-Lab/MMLU-Pro](https://huggingface.co/datasets/TIGER-Lab/MMLU-Pro)
- 配置：`default`
- 划分：`validation`
- 样本：70 题
- 数据接口：[Hugging Face rows](https://datasets-server.huggingface.co/rows?dataset=TIGER-Lab%2FMMLU-Pro&config=default&split=validation&offset=0&length=100)

MMLU-Pro validation 只有 70 条记录。接口请求 `length=100` 时仍返回这 70 条。

## 方法

每道题转换为一个 `choice` 问题，候选项为 `A-J`。每题发送一次 DeepSeek FIM 请求。

- `max_tokens`: `1`
- `temperature`: `0`
- `top_p`: `1`
- `logprobs`: `20`
- 并发：`4`
- 重试：`3`
- `missingLogprobPolicy`: `zero`

计分时只比较 sampled token 与标准答案。prompt 不要求输出解题过程。

## 结果

修复前的默认模板会把答案内容当作输出，比如数学题直接输出计算结果 `0`。候选码缺失后触发 fallback，分数没有参考价值。

| 模板                     |               Flash |    Pro |        零概率 fallback |
| ------------------------ | ------------------: | -----: | ---------------------: |
| 修复前默认模板           |              15.71% | 34.29% | Flash 100%，Pro 65.71% |
| provider 默认模板        | 74.29%，复测 75.71% | 78.57% |                     0% |
| 显式 `code_completion`   |              75.71% | 78.57% |                     0% |
| 显式 `python_completion` |              74.29% | 77.14% |                     0% |

provider 默认模板的延迟：

| 模型              |   平均 |    P50 |    P95 |
| ----------------- | -----: | -----: | -----: |
| `deepseek-flash`  | 397 ms | 383 ms | 689 ms |
| `deepseek-v4-pro` | 716 ms | 735 ms | 971 ms |

每轮 70 题约消耗 14,465 输入 token 和 70 输出 token。

## logprob 限制

DeepSeek FIM 当前只返回 sampled token 的有效 logprob，其他 `top_logprobs` 常为 `-9999`。因此返回概率多为 one-hot，不能当作校准概率分布。

本测试只衡量 sampled token 的选择准确率。多次运行可能因上游模型更新和采样行为产生小幅波动。

## 复现

本地启动 WebUI：

```bash
pnpm install
pnpm --filter @lenml/jevseek build
pnpm --filter @lenml/jevseek-web dev
```

打开 `Benchmark`，选择 `MMLU-Pro`，连接 DeepSeek，运行全部 70 题。
