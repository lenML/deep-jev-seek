export interface ParsedMultimodalData {
  data?: string[];
  invalid?: boolean;
}

function binaryPrefix(value: string, length = 16): string | null {
  try {
    return atob(value.slice(0, Math.ceil(length / 3) * 4));
  } catch {
    return null;
  }
}

function detectImageMimeType(value: string): string | null {
  const prefix = binaryPrefix(value, 16);
  if (!prefix) {
    return null;
  }

  const bytes = Uint8Array.from(prefix, (character) => character.charCodeAt(0));
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp";
  }
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x01 && bytes[3] === 0x00) {
    return "image/x-icon";
  }

  const ascii = prefix.trimStart();
  return ascii.startsWith("<svg") || ascii.startsWith("<?xml") ? "image/svg+xml" : null;
}

export function parseMultimodalData(value: string): ParsedMultimodalData {
  const trimmed = value.trim();
  if (!trimmed) {
    return {};
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return { invalid: true };
    }
    if (parsed.some((item) => typeof item !== "string" || item.trim() === "")) {
      return { invalid: true };
    }
    return { data: parsed };
  } catch {
    return { invalid: true };
  }
}

export function readMultimodalImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fallbackImageName = /\.(?:avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/iu;
    const isImage =
      file.type.startsWith("image/") || (file.type === "" && fallbackImageName.test(file.name));
    if (!isImage) {
      reject(new Error("Unsupported image file"));
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string" || !reader.result.includes(",")) {
        reject(new Error("Invalid image file"));
        return;
      }
      resolve(reader.result.slice(reader.result.indexOf(",") + 1));
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Image read failed")));
    reader.readAsDataURL(file);
  });
}

export function multimodalImagePreview(value: string): string | null {
  const mimeType = detectImageMimeType(value);
  return mimeType ? `data:${mimeType};base64,${value}` : null;
}
