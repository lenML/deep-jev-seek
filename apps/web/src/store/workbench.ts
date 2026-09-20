import {
  DEFAULT_PROMPT_TEMPLATE,
  type JevSeekProvider,
  type JevSeekResponse,
} from "@lenml/jevseek";
import { create } from "zustand";

import { DEFAULT_QUESTIONS_TEXT, DEFAULT_STATE_TEXT } from "@/lib/default-examples";
import type { ConnectionSettings, KeyStorageMode, Language, RawExchange } from "@/lib/types";

const API_KEY_STORAGE_KEY = "jevseek.workbench.api-key";
const KEY_MODE_STORAGE_KEY = "jevseek.workbench.key-mode";
const PREFERENCES_STORAGE_KEY = "jevseek.workbench.preferences";
const LANGUAGE_STORAGE_KEY = "jevseek.workbench.language";
const DEFAULT_BASE_URLS: Record<JevSeekProvider, string> = {
  deepseek: "https://api.deepseek.com/beta",
  llamacpp: "http://127.0.0.1:8080/v1",
};
const DEFAULT_MODELS: Record<JevSeekProvider, string> = {
  deepseek: "deepseek-flash",
  llamacpp: "llamacpp",
};

interface StoredPreferences {
  baseUrl: string;
  model: string;
  provider: JevSeekProvider;
  promptTemplate: string;
}

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

function readStorage(mode: KeyStorageMode) {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    (mode === "local" ? window.localStorage : window.sessionStorage).getItem(API_KEY_STORAGE_KEY) ??
    ""
  );
}

function writeStorage(mode: KeyStorageMode, value: string) {
  if (typeof window === "undefined") {
    return;
  }
  const selected = mode === "local" ? window.localStorage : window.sessionStorage;
  const other = mode === "local" ? window.sessionStorage : window.localStorage;
  other.removeItem(API_KEY_STORAGE_KEY);
  if (value) {
    selected.setItem(API_KEY_STORAGE_KEY, value);
  } else {
    selected.removeItem(API_KEY_STORAGE_KEY);
  }
}

function readKeyStorageMode(): KeyStorageMode {
  if (typeof window === "undefined") {
    return "session";
  }
  return window.localStorage.getItem(KEY_MODE_STORAGE_KEY) === "local" ? "local" : "session";
}

function readLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored === "en" || stored === "zh") {
    return stored;
  }

  return window.navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function readPreferences(): StoredPreferences {
  const fallback = {
    baseUrl: DEFAULT_BASE_URLS.deepseek,
    model: DEFAULT_MODELS.deepseek,
    provider: "deepseek" as const,
    promptTemplate: DEFAULT_PROMPT_TEMPLATE,
  };
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}",
    ) as Partial<StoredPreferences>;
    return {
      baseUrl: stored.baseUrl || fallback.baseUrl,
      model: stored.model || fallback.model,
      provider: stored.provider === "llamacpp" ? "llamacpp" : fallback.provider,
      promptTemplate:
        typeof stored.promptTemplate === "string" ? stored.promptTemplate : fallback.promptTemplate,
    };
  } catch {
    return fallback;
  }
}

function writePreferences(preferences: StoredPreferences) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
  }
}

function persistConnection(connection: ConnectionSettings) {
  writePreferences({
    baseUrl: connection.baseUrl,
    model: connection.model,
    provider: connection.provider,
    promptTemplate: connection.promptTemplate,
  });
}

const keyStorageMode = readKeyStorageMode();
const preferences = readPreferences();
const language = readLanguage();

export const useWorkbenchStore = create<WorkbenchState>((set, get) => ({
  connection: {
    apiKey: readStorage(keyStorageMode),
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
    writeStorage(get().keyStorageMode, apiKey);
    set((state) => ({ connection: { ...state.connection, apiKey } }));
  },
  setKeyStorageMode: (mode) => {
    const apiKey = get().connection.apiKey;
    writeStorage(mode, apiKey);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(KEY_MODE_STORAGE_KEY, mode);
    }
    set({ keyStorageMode: mode });
  },
  clearApiKey: () => {
    writeStorage(get().keyStorageMode, "");
    set((state) => ({ connection: { ...state.connection, apiKey: "" } }));
  },
  setLanguage: (language) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
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
