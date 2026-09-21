import type { PlaygroundDrafts } from "@/lib/playground";
import type { Language } from "@/lib/types";

import { enPresetCatalog } from "./preset-catalog/en";
import { jaPresetCatalog } from "./preset-catalog/ja";
import { koPresetCatalog } from "./preset-catalog/ko";
import { zhPresetCatalog } from "./preset-catalog/zh";
import {
  DEFAULT_PRESET_IDS,
  type PlaygroundPreset,
  type PresetCatalog,
} from "./preset-catalog/types";

export { DEFAULT_PRESET_IDS };
export type { PlaygroundPreset, PresetCatalog };

export function createPresetCatalog(language: Language): PresetCatalog {
  switch (language) {
    case "zh":
      return zhPresetCatalog;
    case "ja":
      return jaPresetCatalog;
    case "ko":
      return koPresetCatalog;
    case "en":
      return enPresetCatalog;
  }
}

export function findPreset(
  catalog: PresetCatalog,
  type: keyof PresetCatalog,
  presetId: string,
): PlaygroundPreset {
  return catalog[type].find((preset) => preset.id === presetId) ?? catalog[type][0]!;
}

export function createInitialDrafts(catalog: PresetCatalog): PlaygroundDrafts {
  return {
    noul: structuredClone(catalog.noul[0]!.drafts.noul!),
    choice: structuredClone(catalog.choice[0]!.drafts.choice!),
    score: structuredClone(catalog.score[0]!.drafts.score!),
  };
}

export function applyPresetDrafts(
  current: PlaygroundDrafts,
  preset: PlaygroundPreset,
): PlaygroundDrafts {
  return { ...current, ...structuredClone(preset.drafts) };
}
