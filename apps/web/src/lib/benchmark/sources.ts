import type { BenchmarkSource } from "./types";

export const BUILT_IN_BENCHMARKS: BenchmarkSource[] = [
  {
    id: "mmlu-pro",
    name: "MMLU-Pro",
    url: "https://datasets-server.huggingface.co/rows?dataset=TIGER-Lab%2FMMLU-Pro&config=default&split=validation&offset=0&length=100",
    kind: "builtin",
  },
  {
    id: "jevbench-easy",
    name: "JevBench Easy",
    url: "https://raw.githubusercontent.com/fstandhartinger/jevbench/refs/heads/main/datasets/public/easy.jsonl",
    kind: "builtin",
  },
  {
    id: "jevbench-hard",
    name: "JevBench Hard",
    url: "https://raw.githubusercontent.com/fstandhartinger/jevbench/refs/heads/main/datasets/public/hard.jsonl",
    kind: "builtin",
  },
  {
    id: "jevbench-original",
    name: "JevBench Original",
    url: "https://github.com/fstandhartinger/jevbench/raw/refs/heads/main/datasets/public/original.jsonl",
    kind: "builtin",
  },
];

export const CUSTOM_BENCHMARK_ID = "custom";

export function normalizeBenchmarkUrl(value: string): string {
  const url = new URL(value);
  if (url.hostname !== "github.com") {
    return url.toString();
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const rawIndex = segments.indexOf("raw");
  if (rawIndex < 2) {
    return url.toString();
  }

  const [owner, repository] = segments;
  const rest = segments.slice(rawIndex + 1).join("/");
  return `https://raw.githubusercontent.com/${owner}/${repository}/${rest}`;
}

export function createCustomBenchmarkSource(value: string): BenchmarkSource | null {
  const url = value.trim();
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    const normalized = normalizeBenchmarkUrl(parsed.toString());
    return {
      id: `custom:${normalized}`,
      name: parsed.hostname,
      url: normalized,
      kind: "custom",
    };
  } catch {
    return null;
  }
}

export function findBuiltInBenchmark(id: string): BenchmarkSource | undefined {
  return BUILT_IN_BENCHMARKS.find((source) => source.id === id);
}
