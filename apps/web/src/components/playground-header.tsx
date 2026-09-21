import { Check, ChevronDown, Github, Languages, Package, Settings2, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useI18n } from "@/i18n/use-i18n";
import { SUPPORTED_LANGUAGES, type Language } from "@/lib/types";

export type Workspace = "playground" | "benchmark" | "batch";

interface PlaygroundHeaderProps {
  workspace: Workspace;
  settingsOpen: boolean;
  onWorkspaceChange: (workspace: Workspace) => void;
  onToggleSettings: () => void;
}

const NPM_URL = "https://www.npmjs.com/package/@lenml/jevseek";
const GITHUB_URL = "https://github.com/lenML/deep-jev-seek";

const LANGUAGE_LABELS: Record<Language, { code: string; name: string }> = {
  en: { code: "EN", name: "English" },
  zh: { code: "ZH", name: "简体中文" },
  ja: { code: "JA", name: "日本語" },
  ko: { code: "KO", name: "한국어" },
};

export function PlaygroundHeader({
  workspace,
  settingsOpen,
  onWorkspaceChange,
  onToggleSettings,
}: PlaygroundHeaderProps) {
  const { language, setLanguage, t } = useI18n();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!languageMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!languageMenuRef.current?.contains(event.target as Node)) {
        setLanguageMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLanguageMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [languageMenuOpen]);

  function selectLanguage(nextLanguage: Language) {
    setLanguage(nextLanguage);
    setLanguageMenuOpen(false);
  }

  return (
    <header className="flex min-h-14 flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2 sm:px-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-signal" />
        <h1 className="text-sm font-medium">{t("app.title")}</h1>
      </div>

      <nav className="order-3 flex basis-full rounded-md border border-border bg-card p-0.5 sm:order-none sm:ml-auto sm:basis-auto">
        {(["playground", "benchmark", "batch"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onWorkspaceChange(item)}
            className={`flex-1 rounded px-2.5 py-1.5 text-xs transition-colors sm:flex-none ${
              workspace === item
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t(
              item === "playground"
                ? "header.playground"
                : item === "benchmark"
                  ? "header.benchmark"
                  : "header.batch",
            )}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <div ref={languageMenuRef} className="relative">
          <button
            type="button"
            aria-label={t("header.language")}
            aria-haspopup="menu"
            aria-expanded={languageMenuOpen}
            aria-controls="language-menu"
            onClick={() => setLanguageMenuOpen((open) => !open)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Languages className="size-4" />
            <span className="hidden font-mono text-[10px] font-semibold sm:inline">
              {LANGUAGE_LABELS[language].code}
            </span>
            <ChevronDown
              className={`size-3 transition-transform ${languageMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {languageMenuOpen ? (
            <div
              id="language-menu"
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-2xl"
            >
              {SUPPORTED_LANGUAGES.map((locale) => (
                <button
                  key={locale}
                  type="button"
                  role="menuitemradio"
                  aria-checked={language === locale}
                  onClick={() => selectLanguage(locale)}
                  className={`flex w-full items-center gap-3 rounded px-2.5 py-2 text-left text-xs transition-colors ${
                    language === locale
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Check
                    className={`size-3.5 ${language === locale ? "opacity-100" : "opacity-0"}`}
                  />
                  <span className="flex-1">{LANGUAGE_LABELS[locale].name}</span>
                  <span className="font-mono text-[10px]">{LANGUAGE_LABELS[locale].code}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <a
          href={NPM_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={t("header.npm")}
          title={t("header.npm")}
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Package className="size-4" />
        </a>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          aria-label={t("header.github")}
          title={t("header.github")}
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Github className="size-4" />
        </a>
        <button
          type="button"
          onClick={onToggleSettings}
          aria-label={t("header.settings")}
          className={`rounded-md border border-border p-2 transition-colors ${
            settingsOpen
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings2 className="size-4" />
        </button>
      </div>
    </header>
  );
}
