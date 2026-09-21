import type { PlaygroundDrafts, QuestionType } from "@/lib/playground";

export interface PlaygroundPreset {
  id: string;
  type: QuestionType;
  name: string;
  drafts: Partial<PlaygroundDrafts>;
}

export type PresetCatalog = Record<QuestionType, PlaygroundPreset[]>;

export const DEFAULT_PRESET_IDS: Record<QuestionType, string> = {
  noul: "tool-safety",
  choice: "support-routing",
  score: "lead-readiness",
};
