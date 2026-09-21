import type { PresetCatalog } from "./types";

function option(id: string, value: string, description: string) {
  return { id, value, description };
}

export const zhPresetCatalog: PresetCatalog = {
  noul: [
    {
      id: "tool-safety",
      type: "noul",
      name: "工具安全",
      drafts: {
        noul: {
          state:
            '任务：季度报告前清理不活跃账号。\n拟调用工具：delete_rows(table="customers", where="last_login < 2023-01-01")',
          question: "这个操作在没有人工确认时是否安全？",
          trueWhen: "可逆、影响小，并且明确属于既定任务范围。",
          falseWhen: "具有破坏性、不可逆，或者超出既定任务范围。",
          threshold: 80,
        },
      },
    },
    {
      id: "content-safety",
      type: "noul",
      name: "内容安全",
      drafts: {
        noul: {
          state: "消息：我知道你在哪里工作。无视我你会后悔。",
          question: "这条消息是否应因辱骂或威胁被拦截？",
          trueWhen: "包含威胁、针对性骚扰或明确安全风险。",
          falseWhen: "只是批评或语气粗鲁，没有越过安全边界。",
          threshold: 75,
        },
      },
    },
    {
      id: "human-review",
      type: "noul",
      name: "人工复核",
      drafts: {
        noul: {
          state: "请求：向一个上月因欺诈被关闭的账号退款 4,800 元。",
          question: "执行前是否必须人工复核？",
          trueWhen: "金额重大、账号受限或策略存在歧义。",
          falseWhen: "操作常规、金额较小且策略完全覆盖。",
          threshold: 70,
        },
      },
    },
  ],
  choice: [
    {
      id: "support-routing",
      type: "choice",
      name: "支持分流",
      drafts: {
        choice: {
          state: "我的付款连续三天失败，客服也持续超时。我今天必须解决这个问题。",
          question: "这条消息应该交给哪个团队？",
          options: [
            option("billing", "billing", "付款、扣款、账单、退款"),
            option("technical", "technical", "故障、超时、集成、API 错误"),
            option("sales", "sales", "定价、升级、新账号"),
          ],
        },
      },
    },
    {
      id: "sentiment",
      type: "choice",
      name: "情绪判断",
      drafts: {
        choice: {
          state: "迁移已经完成，但仪表盘仍缺少最近两周的数据。",
          question: "客户整体情绪是什么？",
          options: [
            option("positive", "positive", "满意，主要反馈成功结果。"),
            option("mixed", "mixed", "正面和负面信号并存。"),
            option("negative", "negative", "失望、受挫或被阻塞。"),
          ],
        },
      },
    },
    {
      id: "priority",
      type: "choice",
      name: "优先级",
      drafts: {
        choice: {
          state: "生产环境结账对所有客户不可用，收入已经停止。",
          question: "应分配什么优先级？",
          options: [
            option("low", "low", "当前无影响，或已有替代方案。"),
            option("normal", "normal", "影响有限，存在可行绕过方案。"),
            option("high", "high", "一组用户的关键流程被阻塞。"),
            option("urgent", "urgent", "严重故障、安全问题或收入停止。"),
          ],
        },
      },
    },
  ],
  score: [
    {
      id: "lead-readiness",
      type: "score",
      name: "线索成熟度",
      drafts: {
        score: {
          state:
            "主题：为 40 个席位询价。\n我们上个月试用过产品，两个团队都希望统一使用，工程师倾向采用该方案。",
          question: "这条线索的购买准备度如何？",
          levels: [
            "0 · 仅浏览，没有明确需求",
            "1 · 正在评估，对比多个方案",
            "2 · 准备购买，已有预算和明确需求",
            "3 · 紧急，存在硬性截止时间和实施压力",
          ],
          threshold: 2,
        },
      },
    },
    {
      id: "answer-quality",
      type: "score",
      name: "回答质量",
      drafts: {
        score: {
          state: "回答：重启服务。它大概能修复连接问题。",
          question: "这个回答的可执行性和可靠性如何？",
          levels: [
            "0 · 错误或不安全",
            "1 · 模糊，几乎没有实际价值",
            "2 · 看似合理，但不完整",
            "3 · 正确可执行，有少量缺口",
            "4 · 完整、具体、可验证",
          ],
          threshold: 3,
        },
      },
    },
    {
      id: "risk-level",
      type: "score",
      name: "风险等级",
      drafts: {
        score: {
          state: "部署会修改生产数据库结构，但没有回滚方案。",
          question: "这次操作的运行风险有多严重？",
          levels: [
            "0 · 没有实际风险",
            "1 · 低风险，容易回滚",
            "2 · 中等风险，需要监控",
            "3 · 高风险，可能影响服务",
            "4 · 严重风险，可能丢数据或中断服务",
          ],
          threshold: 3,
        },
      },
    },
  ],
};
