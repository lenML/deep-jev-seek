import { Check, ChevronDown, Github, Languages, Package, Settings2, Sparkles } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItemIndicator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/use-i18n";
import { WORKSPACES, type Workspace } from "@/lib/hash-workspace";
import { SUPPORTED_LANGUAGES, type Language } from "@/lib/types";

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

  return (
    <header className="flex min-h-14 flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2 sm:px-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-signal" />
        <h1 className="text-sm font-medium">{t("app.title")}</h1>
      </div>

      <nav className="order-3 flex basis-full rounded-md border border-border bg-card p-0.5 sm:order-none sm:ml-auto sm:basis-auto">
        {WORKSPACES.map((item) => (
          <button
            key={item}
            type="button"
            aria-current={workspace === item ? "page" : undefined}
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("header.language")}
              className="group flex h-9 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <Languages className="size-4" />
              <span className="hidden font-mono text-[10px] font-semibold sm:inline">
                {LANGUAGE_LABELS[language].code}
              </span>
              <ChevronDown className="size-3 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={language}
              onValueChange={(value) => setLanguage(value as Language)}
            >
              {SUPPORTED_LANGUAGES.map((locale) => (
                <DropdownMenuRadioItem key={locale} value={locale}>
                  <DropdownMenuItemIndicator className="absolute left-2.5 flex size-3.5 items-center justify-center">
                    <Check className="size-3.5" />
                  </DropdownMenuItemIndicator>
                  <span className="flex-1">{LANGUAGE_LABELS[locale].name}</span>
                  <span className="font-mono text-[10px]">{LANGUAGE_LABELS[locale].code}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

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
