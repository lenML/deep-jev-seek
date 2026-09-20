import type { JevState, QuestionSet } from "@lenml/jevseek";

import type { Language } from "@/lib/types";

export type QuestionType = "noul" | "choice" | "score";

export interface NoulDraft {
  state: string;
  question: string;
  trueWhen: string;
  falseWhen: string;
  threshold: number;
}

export interface ChoiceOptionDraft {
  id: string;
  value: string;
  description: string;
}

export interface ChoiceDraft {
  state: string;
  question: string;
  options: ChoiceOptionDraft[];
}

export interface ScoreDraft {
  state: string;
  question: string;
  levels: string[];
  threshold: number;
}

export interface PlaygroundDrafts {
  noul: NoulDraft;
  choice: ChoiceDraft;
  score: ScoreDraft;
}

export interface BuiltDecision {
  state: JevState;
  questions: QuestionSet;
  threshold: number;
}

function optionId(index: number) {
  return `option-${index}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDrafts(language: Language): PlaygroundDrafts {
  if (language === "zh") {
    return {
      noul: {
        state:
          '任务：季度报告前清理不活跃账号。\n拟调用工具：delete_rows(table="customers", where="last_login < 2023-01-01")',
        question: "这个操作在没有人工确认时是否安全？",
        trueWhen: "可逆、影响小，并且明确属于既定任务范围。",
        falseWhen: "具有破坏性、不可逆，或者超出既定任务范围。",
        threshold: 80,
      },
      choice: {
        state: "我的付款连续三天失败，客服也持续超时。我今天必须解决这个问题。",
        question: "这条消息应该交给哪个团队？",
        options: [
          { id: optionId(0), value: "billing", description: "付款、扣款、账单、退款" },
          { id: optionId(1), value: "technical", description: "故障、超时、集成、API 错误" },
          { id: optionId(2), value: "sales", description: "定价、升级、新账号" },
        ],
      },
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
    };
  }

  return {
    noul: {
      state:
        'Task: clean up inactive accounts before the quarterly report.\nProposed tool call: delete_rows(table="customers", where="last_login < 2023-01-01")',
      question: "Is this action safe to run without a human approving it first?",
      trueWhen: "Reversible, low-impact, and clearly within the stated task.",
      falseWhen: "Destructive, irreversible, or broader than the task requires.",
      threshold: 80,
    },
    choice: {
      state:
        "My payout has failed three days in a row and support chat keeps timing out. I need this fixed today.",
      question: "Which team should handle this message?",
      options: [
        { id: optionId(0), value: "billing", description: "Payments, payouts, invoices, refunds" },
        {
          id: optionId(1),
          value: "technical",
          description: "Bugs, outages, integrations, API errors",
        },
        { id: optionId(2), value: "sales", description: "Pricing, upgrades, new accounts" },
      ],
    },
    score: {
      state:
        "Subject: Pricing for 40 seats.\nWe trialed your product last month across two teams and the engineers want to standardize on it.",
      question: "How ready is this lead to buy?",
      levels: [
        "0 · Just browsing, no stated need",
        "1 · Evaluating, comparing options",
        "2 · Ready to buy, budget and clear need",
        "3 · Urgent, hard deadline and implementation pressure",
      ],
      threshold: 2,
    },
  };
}

export function buildDecision(type: QuestionType, drafts: PlaygroundDrafts): BuiltDecision {
  switch (type) {
    case "noul": {
      const draft = drafts.noul;
      return {
        state: draft.state,
        threshold: draft.threshold,
        questions: {
          guardrail: {
            type: "noul",
            instructions: draft.question,
            criteria: {
              true: draft.trueWhen,
              false: draft.falseWhen,
            },
          },
        },
      };
    }
    case "choice": {
      const draft = drafts.choice;
      const criteria = Object.fromEntries(
        draft.options.map((option, index) => [
          option.value.trim() || `option_${index + 1}`,
          option.description,
        ]),
      );
      return {
        state: draft.state,
        threshold: 50,
        questions: {
          routing: {
            type: "choice",
            instructions: draft.question,
            criteria,
          },
        },
      };
    }
    case "score": {
      const draft = drafts.score;
      return {
        state: draft.state,
        threshold: draft.threshold,
        questions: {
          qualification: {
            type: "score",
            instructions: draft.question,
            criteria: draft.levels,
          },
        },
      };
    }
  }
}

export function createChoiceOption(index: number): ChoiceOptionDraft {
  return {
    id: optionId(index),
    value: "",
    description: "",
  };
}
