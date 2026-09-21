import type { PresetCatalog } from "./types";

function option(id: string, value: string, description: string) {
  return { id, value, description };
}

export const enPresetCatalog: PresetCatalog = {
  noul: [
    {
      id: "tool-safety",
      type: "noul",
      name: "Tool safety",
      drafts: {
        noul: {
          state:
            'Task: clean up inactive accounts before the quarterly report.\nProposed tool call: delete_rows(table="customers", where="last_login < 2023-01-01")',
          question: "Is this action safe to run without a human approving it first?",
          trueWhen: "Reversible, low-impact, and clearly within the stated task.",
          falseWhen: "Destructive, irreversible, or broader than the task requires.",
          threshold: 80,
        },
      },
    },
    {
      id: "content-safety",
      type: "noul",
      name: "Content safety",
      drafts: {
        noul: {
          state: "Message: I know where you work. You will regret ignoring me.",
          question: "Should this message be blocked as abusive or threatening?",
          trueWhen: "It contains a threat, targeted harassment, or an explicit safety risk.",
          falseWhen: "It is critical or rude but does not cross a safety boundary.",
          threshold: 75,
        },
      },
    },
    {
      id: "human-review",
      type: "noul",
      name: "Human review",
      drafts: {
        noul: {
          state:
            "Request: refund $4,800 to a customer whose account was closed for fraud last month.",
          question: "Should this action require human review before execution?",
          trueWhen: "The amount is material, the account is restricted, or policy is ambiguous.",
          falseWhen: "The action is routine, low-value, and fully covered by policy.",
          threshold: 70,
        },
      },
    },
  ],
  choice: [
    {
      id: "support-routing",
      type: "choice",
      name: "Support routing",
      drafts: {
        choice: {
          state:
            "My payout has failed three days in a row and support chat keeps timing out. I need this fixed today.",
          question: "Which team should handle this message?",
          options: [
            option("billing", "billing", "Payments, payouts, invoices, refunds"),
            option("technical", "technical", "Bugs, outages, integrations, API errors"),
            option("sales", "sales", "Pricing, upgrades, new accounts"),
          ],
        },
      },
    },
    {
      id: "sentiment",
      type: "choice",
      name: "Sentiment",
      drafts: {
        choice: {
          state:
            "The migration worked, but the dashboard is still missing the last two weeks of data.",
          question: "What is the overall customer sentiment?",
          options: [
            option("positive", "positive", "Satisfied and mainly reporting success."),
            option("mixed", "mixed", "Balanced positive and negative signals."),
            option("negative", "negative", "Frustrated, disappointed, or blocked."),
          ],
        },
      },
    },
    {
      id: "priority",
      type: "choice",
      name: "Priority",
      drafts: {
        choice: {
          state: "Production checkout is down for all customers and revenue is stopped.",
          question: "What priority should be assigned?",
          options: [
            option("low", "low", "No current impact or workaround exists."),
            option("normal", "normal", "Limited impact with a practical workaround."),
            option("high", "high", "Major workflow blocked for a group of users."),
            option("urgent", "urgent", "Critical outage, safety issue, or revenue stop."),
          ],
        },
      },
    },
  ],
  score: [
    {
      id: "lead-readiness",
      type: "score",
      name: "Lead readiness",
      drafts: {
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
      },
    },
    {
      id: "answer-quality",
      type: "score",
      name: "Answer quality",
      drafts: {
        score: {
          state: "Answer: Restart the service. It should probably fix the connection issue.",
          question: "How actionable and reliable is this answer?",
          levels: [
            "0 · Incorrect or unsafe",
            "1 · Vague, with little practical value",
            "2 · Plausible but incomplete",
            "3 · Correct and actionable with minor gaps",
            "4 · Complete, specific, and verifiable",
          ],
          threshold: 3,
        },
      },
    },
    {
      id: "risk-level",
      type: "score",
      name: "Risk level",
      drafts: {
        score: {
          state: "The deployment changes the production database schema without a rollback plan.",
          question: "How severe is the operational risk?",
          levels: [
            "0 · No meaningful risk",
            "1 · Low risk, easily reversible",
            "2 · Moderate risk, needs monitoring",
            "3 · High risk, likely service impact",
            "4 · Critical risk, data loss or outage likely",
          ],
          threshold: 3,
        },
      },
    },
  ],
};
