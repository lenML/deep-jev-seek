import { ImageOff, ImagePlus, X } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/use-i18n";
import { multimodalImagePreview, parseMultimodalData, readMultimodalImage } from "@/lib/multimodal";

interface MultimodalDataFieldProps {
  error: string | null;
  value: string;
  onChange: (value: string) => void;
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_IMAGES_PER_DROP = 8;

export function MultimodalDataField({ error, value, onChange }: MultimodalDataFieldProps) {
  const { t } = useI18n();
  const [fileError, setFileError] = useState<string | null>(null);
  const images = parseMultimodalData(value).data ?? [];
  const visibleError = fileError ?? error;
  const { getInputProps, getRootProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    maxFiles: MAX_IMAGES_PER_DROP,
    maxSize: MAX_IMAGE_BYTES,
    multiple: true,
    onDropAccepted: (files) => void handleImages(files),
    onDropRejected: ([rejection]) => {
      const code = rejection?.errors[0]?.code;
      if (code === "file-too-large") {
        setFileError(t("multimodal.fileTooLarge"));
      } else if (code === "too-many-files") {
        setFileError(t("multimodal.tooManyFiles"));
      } else {
        setFileError(t("multimodal.uploadError"));
      }
    },
  });

  async function handleImages(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const results = await Promise.allSettled(files.map(readMultimodalImage));
    const uploaded = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : [],
    );
    if (uploaded.length > 0) {
      const current = parseMultimodalData(value).data ?? [];
      onChange(JSON.stringify([...current, ...uploaded], null, 2));
    }
    if (results.some((result) => result.status === "rejected")) {
      setFileError(t("multimodal.uploadError"));
    } else {
      setFileError(null);
    }
  }

  function removeImage(indexToRemove: number) {
    const next = images.filter((_, index) => index !== indexToRemove);
    onChange(next.length > 0 ? JSON.stringify(next, null, 2) : "");
    setFileError(null);
  }

  return (
    <div className="mt-5 space-y-3 border-t border-border pt-5">
      <div>
        <Label id="multimodal-upload-label">{t("multimodal.title")}</Label>
        <p id="multimodal-data-hint" className="mt-1 text-[11px] leading-4 text-muted-foreground">
          {t("multimodal.hint")}
        </p>
      </div>

      <div
        {...getRootProps({
          "aria-labelledby": "multimodal-upload-label",
          className: `flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border bg-background p-4 transition-colors hover:border-signal/60 hover:bg-signal/5 ${
            isDragActive ? "border-signal bg-signal/5" : ""
          }`,
        })}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-secondary text-signal">
          <ImagePlus className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-xs font-medium text-foreground">
            {t("multimodal.upload")}
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">
            {t("multimodal.uploadHint")}
          </span>
        </span>
        <input {...getInputProps({ "aria-label": t("multimodal.upload") })} />
      </div>

      {images.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => {
            const preview = multimodalImagePreview(image);
            return (
              <div
                key={`${index}-${image.slice(0, 24)}`}
                className="group relative overflow-hidden rounded-md border border-border bg-background"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-black/20">
                  {preview ? (
                    <img
                      src={preview}
                      alt={t("multimodal.imageAlt", { value: index + 1 })}
                      className="size-full object-contain"
                    />
                  ) : (
                    <ImageOff className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center justify-between border-t border-border px-2 py-1.5">
                  <span className="font-mono text-[10px] text-muted-foreground">#{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={t("multimodal.remove", { value: index + 1 })}
                    className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground">{t("multimodal.empty")}</p>
      )}

      <div className="space-y-2 pt-1">
        <Label htmlFor="multimodal-data">{t("multimodal.base64")}</Label>
        <Textarea
          id="multimodal-data"
          value={value}
          aria-describedby="multimodal-data-hint"
          aria-invalid={Boolean(visibleError)}
          onChange={(event) => {
            onChange(event.target.value);
            setFileError(null);
          }}
          placeholder='["base64-data"]'
          spellCheck={false}
          className="editor-scroll min-h-24 resize-y bg-background font-mono text-[11px] leading-5"
        />
      </div>

      {visibleError ? (
        <p role="alert" className="text-xs text-destructive">
          {visibleError}
        </p>
      ) : null}
    </div>
  );
}
