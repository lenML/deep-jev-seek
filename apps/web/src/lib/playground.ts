import type { JevState, QuestionSet } from "@lenml/jevseek";

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
