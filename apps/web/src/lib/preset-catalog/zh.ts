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
            '任务：在季度报告前清理不活跃账号。\n拟调用工具：delete_rows(table="customers", where="last_login < 2023-01-01")',
          question: "这个操作在没有人工确认时是否安全？",
          trueWhen: "可逆、影响小，且在任务范围内。",
          falseWhen: "会破坏数据、不可逆，或超出任务范围。",
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
          question: "这条消息是否包含威胁或骚扰，需要拦截？",
          trueWhen: "包含威胁、定向骚扰或明确的安全风险。",
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
          trueWhen: "金额较大、账号受限，或策略不明确。",
          falseWhen: "常规低额操作，并且策略已有明确规定。",
          threshold: 70,
        },
      },
    },
  ],
  choice: [
    {
      id: "support-routing",
      type: "choice",
      name: "工单分流",
      drafts: {
        choice: {
          state: "付款连续三天失败，客服也一直超时。今天必须解决。",
          question: "这条消息应交给哪个团队？",
          options: [
            option("billing", "billing", "付款、扣款、账单与退款"),
            option("technical", "technical", "故障、超时、集成与 API 错误"),
            option("sales", "sales", "定价、升级与新账号"),
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
          question: "客户情绪属于哪一类？",
          options: [
            option("positive", "positive", "满意，主要反馈正面结果。"),
            option("mixed", "mixed", "正面和负面信号并存。"),
            option("negative", "negative", "失望、受挫或受阻。"),
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
          question: "应分配哪个优先级？",
          options: [
            option("low", "low", "当前无影响，或已有替代方案。"),
            option("normal", "normal", "影响有限，有可用的绕过方案。"),
            option("high", "high", "一组用户的关键流程受阻。"),
            option("urgent", "urgent", "严重故障、安全问题或收入中断。"),
          ],
        },
      },
    },
  ],
  score: [
    {
      id: "lead-readiness",
      type: "score",
      name: "购买准备度",
      drafts: {
        score: {
          state:
            "主题：咨询 40 个席位的价格。\n我们上个月在两个团队试用了产品，工程师希望统一采用。",
          question: "这条线索的购买准备度如何？",
          levels: [
            "0 · 仅浏览，没有明确需求",
            "1 · 正在评估，比较多个方案",
            "2 · 准备购买，已有预算和明确需求",
            "3 · 时间紧迫，有硬性截止时间和实施压力",
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
          state: "回答：重启服务，应该能修复连接问题。",
          question: "这个回答是否可靠、可执行？",
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
          question: "这次操作的风险有多高？",
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
