import { Settings2, Sparkles } from "lucide-react";

import { useI18n } from "@/i18n/use-i18n";

interface PlaygroundHeaderProps {
  settingsOpen: boolean;
  onToggleSettings: () => void;
}

export function PlaygroundHeader({ settingsOpen, onToggleSettings }: PlaygroundHeaderProps) {
  const { language, setLanguage, t } = useI18n();

  return (
    <header className="flex min-h-14 items-center gap-2 border-b border-border bg-background px-3 py-2 sm:px-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="size-4 text-signal" />
        <h1 className="text-sm font-medium">{t("app.title")}</h1>
      </div>

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
