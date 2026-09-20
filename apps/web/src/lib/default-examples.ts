export const DEFAULT_STATE = {
  customer: {
    id: "cus_1042",
    plan: "pro",
    accountAgeDays: 184,
  },
  message:
    "I was charged twice for the same annual renewal. Please refund the duplicate charge today.",
  paymentAttempts: 2,
  duplicateCharge: true,
  refundRequested: true,
};

export const DEFAULT_QUESTIONS = {
  category: {
    type: "choice",
    instructions: "Which support team should handle this request?",
    criteria: {
      billing: "Payment, invoices, or subscription issues",
      technical: "Bugs, outages, or integration failures",
      sales: "Pricing, upgrades, or account questions",
    },
  },
  priority: {
    type: "score",
    instructions: "How urgent is this request?",
    criteria: ["Low", "Normal", "Urgent"],
  },
  refundRequested: {
    type: "noul",
    instructions: "Is the customer explicitly requesting a refund?",
    criteria: {
      false: "No refund requested",
      true: "Refund requested",
    },
  },
} satisfies Record<string, unknown>;

export const DEFAULT_STATE_TEXT = JSON.stringify(DEFAULT_STATE, null, 2);
export const DEFAULT_QUESTIONS_TEXT = JSON.stringify(DEFAULT_QUESTIONS, null, 2);
