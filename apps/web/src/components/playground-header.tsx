import { Settings2, Sparkles } from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";

export type Workspace = "playground" | "benchmark";

interface PlaygroundHeaderProps {
  workspace: Workspace;
  settingsOpen: boolean;
  onWorkspaceChange: (workspace: Workspace) => void;
  onToggleSettings: () => void;
}

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
        {(["playground", "benchmark"] as const).map((item) => (
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
            {t(item === "playground" ? "header.playground" : "header.benchmark")}
          </button>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <div
          className="flex rounded-md border border-border bg-card p-0.5"
          role="group"
          aria-label={t("header.language")}
        >
          {(["en", "zh"] as const).map((locale) => (
            <button
              key={locale}
              type="button"
              onClick={() => setLanguage(locale)}
              className={`rounded px-2 py-1 text-[10px] font-semibold uppercase ${
                language === locale
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {locale === "en" ? "EN" : "中文"}
            </button>
          ))}
        </div>
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
