import { Eye, EyeOff, Trash2, X } from "lucide-react";
import { useState } from "react";

import { PromptTemplateEditor } from "@/components/prompt-template-editor";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/use-i18n";
import { useWorkbenchStore } from "@/store/workbench";

interface ConnectionSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectionSettings({ open, onOpenChange }: ConnectionSettingsProps) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-labelledby="connection-title"
        aria-describedby="connection-description"
        className="left-auto right-0 top-0 flex h-dvh max-h-dvh w-full max-w-3xl translate-x-0 translate-y-0 flex-col rounded-none border-y-0 border-r-0 bg-background duration-300 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <DialogTitle
              id="connection-title"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-signal"
            >
              {t("connection.title")}
            </DialogTitle>
            <DialogDescription id="connection-description" className="mt-1">
              {t("connection.drawerHint")}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label={t("connection.close")}
              className="rounded-md border border-border p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </DialogClose>
        </div>

        <div className="grid gap-4 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
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

          <div className="space-y-2 sm:col-span-2">
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

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="base-url">{t("connection.baseUrl")}</Label>
            <Input
              id="base-url"
              value={connection.baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              className="h-9 font-mono text-xs"
            />
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

          <p className="text-[11px] leading-4 text-muted-foreground sm:col-span-2">
            {t("connection.security")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
