import { en } from "./locales/en";
import { ja } from "./locales/ja";
import { ko } from "./locales/ko";
import { zh } from "./locales/zh";

export const messages = { en, zh, ja, ko } as const;
export type MessageKey = keyof typeof en;
export type MessageVariables = Record<string, string | number>;
