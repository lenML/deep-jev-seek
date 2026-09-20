import { Eye, EyeOff, KeyRound, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useWorkbenchStore } from "@/store/workbench";

const storageOptions = [
  {
    value: "session" as const,
    label: "This tab",
    detail: "sessionStorage",
  },
  {
    value: "local" as const,
    label: "This browser",
    detail: "localStorage",
  },
];

export function ConnectionPanel() {
  const connection = useWorkbenchStore((state) => state.connection);
  const keyStorageMode = useWorkbenchStore((state) => state.keyStorageMode);
  const setApiKey = useWorkbenchStore((state) => state.setApiKey);
  const setKeyStorageMode = useWorkbenchStore((state) => state.setKeyStorageMode);
  const clearApiKey = useWorkbenchStore((state) => state.clearApiKey);
  const setBaseUrl = useWorkbenchStore((state) => state.setBaseUrl);
  const setModel = useWorkbenchStore((state) => state.setModel);
  const [showKey, setShowKey] = useState(false);

  return (
    <Card className="surface-grid overflow-hidden">
      <CardHeader className="border-b border-border/70 bg-card/75">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              <KeyRound className="size-3.5" />
              DeepSeek connection
            </div>
            <CardTitle>Bring your own key</CardTitle>
            <CardDescription>
              Requests go from this browser directly to your Base URL. This site has no proxy or key service.
            </CardDescription>
          </div>
          <ShieldCheck className="mt-1 size-6 shrink-0 text-primary" aria-label="Browser-only credentials" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5 sm:pt-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="api-key">API key</Label>
            {connection.apiKey ? (
              <button
                type="button"
                onClick={clearApiKey}
                className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="size-3" />
                Clear
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
              spellCheck={false}
              className="pr-11 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey((visible) => !visible)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Key storage</Label>
          <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-secondary/45 p-1">
            {storageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setKeyStorageMode(option.value)}
                className={cn(
                  "rounded px-3 py-2 text-left transition-colors",
                  keyStorageMode === option.value
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="block font-mono text-[10px] uppercase tracking-[0.1em]">
                  {option.detail}
                </span>
              </button>
            ))}
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            Session is the default. Local storage only happens after you select “This browser”.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="base-url">Base URL</Label>
          <Input
            id="base-url"
            value={connection.baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            placeholder="https://api.deepseek.com"
            inputMode="url"
            spellCheck={false}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="model">Model</Label>
          <Input
            id="model"
            value={connection.model}
            onChange={(event) => setModel(event.target.value)}
            placeholder="deepseek-flash"
            list="jevseek-models"
            spellCheck={false}
          />
          <datalist id="jevseek-models">
            <option value="deepseek-flash" />
            <option value="deepseek-v4-pro" />
          </datalist>
        </div>

        <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            Your key is never sent to this project. Browser CORS and your network must allow direct access to DeepSeek.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
