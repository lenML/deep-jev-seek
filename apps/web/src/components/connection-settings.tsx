import { Eye, EyeOff, Trash2 } from "lucide-react";
import { useState } from "react";

import { PromptTemplateEditor } from "@/components/prompt-template-editor";
import { useI18n } from "@/i18n/use-i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkbenchStore } from "@/store/workbench";

export function ConnectionSettings() {
  const { t } = useI18n();
  const connection = useWorkbenchStore((state) => state.connection);
  const provider = useWorkbenchStore((state) => state.connection.provider);
  const keyStorageMode = useWorkbenchStore((state) => state.keyStorageMode);
  const setApiKey = useWorkbenchStore((state) => state.setApiKey);
  const setBaseUrl = useWorkbenchStore((state) => state.setBaseUrl);
  const setModel = useWorkbenchStore((state) => state.setModel);
  const setProvider = useWorkbenchStore((state) => state.setProvider);
  const setKeyStorageMode = useWorkbenchStore((state) => state.setKeyStorageMode);
  const clearApiKey = useWorkbenchStore((state) => state.clearApiKey);
  const [showKey, setShowKey] = useState(false);

  return (
    <section
      aria-label={t("connection.title")}
      className="grid gap-4 border-b border-border bg-card px-4 py-4 lg:grid-cols-[9rem_minmax(0,1.2fr)_minmax(0,1fr)_10rem_12rem] lg:px-5"
    >
      <div className="space-y-2">
        <Label htmlFor="provider">{t("connection.provider")}</Label>
        <select
          id="provider"
          value={provider}
          onChange={(event) => setProvider(event.target.value as typeof provider)}
          className="focus:ring-ring/20 h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground outline-none focus:border-ring focus:ring-2"
        >
          <option value="deepseek">{t("connection.provider.deepseek")}</option>
          <option value="llamacpp">{t("connection.provider.llamacpp")}</option>
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="api-key">{t("connection.apiKey")}</Label>
          {connection.apiKey ? (
            <button
              type="button"
              onClick={clearApiKey}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Trash2 className="size-3" />
              {t("connection.clearKey")}
            </button>
          ) : null}
        </div>
        <div className="relative">
          <Input
            id="api-key"
            type={showKey ? "text" : "password"}
            value={connection.apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="sk-..."
            autoComplete="off"
            className="h-9 pr-10 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey((visible) => !visible)}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-2 text-muted-foreground hover:text-foreground"
            aria-label={t(showKey ? "connection.hideKey" : "connection.showKey")}
          >
            {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="base-url">{t("connection.baseUrl")}</Label>
        <Input
          id="base-url"
          value={connection.baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          className="h-9 font-mono text-xs"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="model">{t("connection.model")}</Label>
        {provider === "deepseek" ? (
          <select
            id="model"
            value={connection.model}
            onChange={(event) => setModel(event.target.value)}
            className="focus:ring-ring/20 h-9 w-full rounded-md border border-input bg-background px-3 font-mono text-xs text-foreground outline-none focus:border-ring focus:ring-2"
          >
            <option value="deepseek-flash">deepseek-flash</option>
            <option value="deepseek-v4-pro">deepseek-v4-pro</option>
          </select>
        ) : (
          <Input
            id="model"
            value={connection.model}
            onChange={(event) => setModel(event.target.value)}
            className="h-9 font-mono text-xs"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label>{t("connection.storage")}</Label>
        <div className="grid h-9 grid-cols-2 rounded-md border border-input bg-background p-0.5">
          {(["session", "local"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setKeyStorageMode(mode)}
              className={`rounded px-2 text-[10px] font-medium ${
                keyStorageMode === mode
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(mode === "local" ? "connection.local" : "connection.session")}
            </button>
          ))}
        </div>
      </div>
      <PromptTemplateEditor />
      <p className="text-[11px] leading-4 text-muted-foreground lg:col-span-5">
        {t("connection.security")}
      </p>
    </section>
  );
}
