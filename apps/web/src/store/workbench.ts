import {
  defaultPromptTemplateForProvider,
  type JevSeekProvider,
  type JevSeekResponse,
} from "@lenml/jevseek";
import { create } from "zustand";

import { DEFAULT_QUESTIONS_TEXT, DEFAULT_STATE_TEXT } from "@/lib/default-examples";
import type { ConnectionSettings, KeyStorageMode, Language, RawExchange } from "@/lib/types";
import {
  DEFAULT_BASE_URLS,
  DEFAULT_MODELS,
  persistConnection,
  persistLanguage,
  readApiKeyStorage,
  readKeyStorageMode,
  readLanguage,
  readPreferences,
  writeApiKeyStorage,
  writeKeyStorageMode,
} from "@/lib/workbench-storage";

interface WorkbenchState {
  connection: ConnectionSettings;
  language: Language;
  keyStorageMode: KeyStorageMode;
  stateText: string;
  questionsText: string;
  result: JevSeekResponse | null;
  rawExchanges: RawExchange[];
  error: string | null;
  isRunning: boolean;
  latencyMs: number | null;
  completedAt: string | null;
  setApiKey: (apiKey: string) => void;
  setKeyStorageMode: (mode: KeyStorageMode) => void;
  clearApiKey: () => void;
  setLanguage: (language: Language) => void;
  setProvider: (provider: JevSeekProvider) => void;
  setBaseUrl: (baseUrl: string) => void;
  setModel: (model: string) => void;
  setPromptTemplate: (promptTemplate: string) => void;
  setStateText: (stateText: string) => void;
  setQuestionsText: (questionsText: string) => void;
  setRunning: (isRunning: boolean) => void;
  setResult: (result: JevSeekResponse, rawExchanges: RawExchange[], latencyMs: number) => void;
  setError: (error: string | null) => void;
  resetExamples: () => void;
  clearOutput: () => void;
}

const keyStorageMode = readKeyStorageMode();
const preferences = readPreferences();
const language = readLanguage();

if (typeof document !== "undefined") {
  document.documentElement.lang = language;
}

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  connection: {
    apiKey: readApiKeyStorage(keyStorageMode),
    ...preferences,
  },
  language,
  keyStorageMode,
  stateText: DEFAULT_STATE_TEXT,
  questionsText: DEFAULT_QUESTIONS_TEXT,
  result: null,
  rawExchanges: [],
  error: null,
  isRunning: false,
  latencyMs: null,
  completedAt: null,
  setApiKey: (apiKey) => {
    writeApiKeyStorage(get().keyStorageMode, apiKey);
    set((state) => ({ connection: { ...state.connection, apiKey } }));
  },
  setKeyStorageMode: (mode) => {
    const apiKey = get().connection.apiKey;
    writeApiKeyStorage(mode, apiKey);
    writeKeyStorageMode(mode);
    set({ keyStorageMode: mode });
  },
  clearApiKey: () => {
    writeApiKeyStorage(get().keyStorageMode, "");
    set((state) => ({ connection: { ...state.connection, apiKey: "" } }));
  },
  setLanguage: (language) => {
    persistLanguage(language);
    set({ language });
  },
  setProvider: (provider) => {
    const current = get().connection;
    const next = {
      ...current,
      provider,
      baseUrl:
        current.baseUrl === DEFAULT_BASE_URLS[current.provider]
          ? DEFAULT_BASE_URLS[provider]
          : current.baseUrl,
      model:
        current.model === DEFAULT_MODELS[current.provider]
          ? DEFAULT_MODELS[provider]
          : current.model,
      promptTemplate:
        current.promptTemplate === defaultPromptTemplateForProvider(current.provider)
          ? defaultPromptTemplateForProvider(provider)
          : current.promptTemplate,
    };
    persistConnection(next);
    set({ connection: next });
  },
  setBaseUrl: (baseUrl) => {
    const next = { ...get().connection, baseUrl };
    persistConnection(next);
    set({ connection: next });
  },
  setModel: (model) => {
    const next = { ...get().connection, model };
    persistConnection(next);
    set({ connection: next });
  },
  setPromptTemplate: (promptTemplate) => {
    const next = { ...get().connection, promptTemplate };
    persistConnection(next);
    set({ connection: next });
  },
  setStateText: (stateText) => set({ stateText }),
  setQuestionsText: (questionsText) => set({ questionsText }),
  setRunning: (isRunning) => set({ isRunning }),
  setResult: (result, rawExchanges, latencyMs) =>
    set({
      result,
      rawExchanges,
      latencyMs,
      completedAt: new Date().toISOString(),
      error: null,
    }),
  setError: (error) => set({ error }),
  resetExamples: () =>
    set({
      stateText: DEFAULT_STATE_TEXT,
      questionsText: DEFAULT_QUESTIONS_TEXT,
    }),
  clearOutput: () =>
    set({
      result: null,
      rawExchanges: [],
      error: null,
      latencyMs: null,
      completedAt: null,
    }),
}));
