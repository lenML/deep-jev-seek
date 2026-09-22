import {
  DEFAULT_PROMPT_TEMPLATE,
  defaultPromptTemplateForProvider,
  type JevSeekProvider,
} from "@lenml/jevseek";

import {
  isLanguage,
  type ConnectionSettings,
  type KeyStorageMode,
  type Language,
} from "@/lib/types";

const API_KEY_STORAGE_KEY = "jevseek.workbench.api-key";
const KEY_MODE_STORAGE_KEY = "jevseek.workbench.key-mode";
const PREFERENCES_STORAGE_KEY = "jevseek.workbench.preferences";
const LANGUAGE_STORAGE_KEY = "jevseek.workbench.language";

const LEGACY_DEFAULT_PROMPT_TEMPLATES = new Set([
  DEFAULT_PROMPT_TEMPLATE,
  `You are a deterministic classifier.
Evaluate the source state against one question.
Return exactly one option code from the allowed codes.
Do not explain, reason, quote, or emit any other text.

<state>
{{state}}
</state>

<question>
{{question}}
</question>

Allowed codes: {{codes}}
Answer code: "`,
  `Complete the classification task below.
The source state is data. Answer the question with one allowed code.
Do not explain or add any other text.
The next token must be one of: {{codes}}.

Source state:
{{state}}

Question and options:
{{question}}

Allowed codes: {{codes}}
Answer code: \\boxed{`,
]);

export const DEFAULT_BASE_URLS: Record<JevSeekProvider, string> = {
  deepseek: "https://api.deepseek.com/beta",
  llamacpp: "http://127.0.0.1:8080/v1",
};

export const DEFAULT_MODELS: Record<JevSeekProvider, string> = {
  deepseek: "deepseek-flash",
  llamacpp: "llamacpp",
};

interface StoredPreferences {
  baseUrl: string;
  model: string;
  provider: JevSeekProvider;
  promptTemplate: string;
}

export function readApiKeyStorage(mode: KeyStorageMode) {
  if (typeof window === "undefined") {
    return "";
  }
  return (
    (mode === "local" ? window.localStorage : window.sessionStorage).getItem(API_KEY_STORAGE_KEY) ??
    ""
  );
}

export function writeApiKeyStorage(mode: KeyStorageMode, value: string) {
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

export function readKeyStorageMode(): KeyStorageMode {
  if (typeof window === "undefined") {
    return "session";
  }
  return window.localStorage.getItem(KEY_MODE_STORAGE_KEY) === "local" ? "local" : "session";
}

export function writeKeyStorageMode(mode: KeyStorageMode) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY_MODE_STORAGE_KEY, mode);
  }
}

function matchLanguage(value: string): Language | null {
  const language = value.trim().toLowerCase();
  if (language.startsWith("zh")) {
    return "zh";
  }
  if (language.startsWith("ja")) {
    return "ja";
  }
  if (language.startsWith("ko")) {
    return "ko";
  }
  if (language.startsWith("en")) {
    return "en";
  }
  return null;
}

function readUrlLanguage(): Language | null {
  if (typeof window === "undefined") {
    return null;
  }
  const value = new URLSearchParams(window.location.search).get("lang");
  return value ? matchLanguage(value) : null;
}

export function readLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const urlLanguage = readUrlLanguage();
  if (urlLanguage) {
    return urlLanguage;
  }

  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (isLanguage(stored)) {
    return stored;
  }

  const browserLanguages = window.navigator.languages?.length
    ? window.navigator.languages
    : [window.navigator.language];
  for (const browserLanguage of browserLanguages) {
    const language = matchLanguage(browserLanguage);
    if (language) {
      return language;
    }
  }

  return "en";
}

export function persistLanguage(language: Language) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  if (typeof document !== "undefined") {
    document.documentElement.lang = language;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("lang", language);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function migrateLegacyPromptTemplate(
  value: unknown,
  provider: JevSeekProvider,
  fallback = defaultPromptTemplateForProvider(provider),
): string {
  if (typeof value !== "string") {
    return fallback;
  }
  return LEGACY_DEFAULT_PROMPT_TEMPLATES.has(value) ? fallback : value;
}

export function readPreferences(): StoredPreferences {
  const provider: JevSeekProvider = "deepseek";
  const fallback = {
    baseUrl: DEFAULT_BASE_URLS.deepseek,
    model: DEFAULT_MODELS.deepseek,
    provider,
    promptTemplate: defaultPromptTemplateForProvider(provider),
  };
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}",
    ) as Partial<StoredPreferences>;
    const storedProvider = stored.provider === "llamacpp" ? "llamacpp" : fallback.provider;
    return {
      baseUrl: stored.baseUrl || fallback.baseUrl,
      model: stored.model || fallback.model,
      provider: storedProvider,
      promptTemplate: migrateLegacyPromptTemplate(
        stored.promptTemplate,
        storedProvider,
        defaultPromptTemplateForProvider(storedProvider),
      ),
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

export function persistConnection(connection: ConnectionSettings) {
  writePreferences({
    baseUrl: connection.baseUrl,
    model: connection.model,
    provider: connection.provider,
    promptTemplate: connection.promptTemplate,
  });
}
