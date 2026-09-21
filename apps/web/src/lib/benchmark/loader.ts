import { parseBenchmarkDataset } from "./parser";
import { normalizeBenchmarkUrl } from "./sources";
import type { BenchmarkDataset, BenchmarkSource } from "./types";

export function loadBenchmarkDataset(
  source: BenchmarkSource,
  options: { fetchImpl?: typeof fetch; signal?: AbortSignal } = {},
): Promise<BenchmarkDataset> {
  const fetchImpl = options.fetchImpl ?? fetch;
  return fetchImpl(normalizeBenchmarkUrl(source.url), {
    headers: {
      Accept: "application/json, text/plain, text/csv, */*",
    },
    signal: options.signal,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`${source.name} request failed: HTTP ${response.status}`);
    }
    return parseBenchmarkDataset(await response.text(), source);
  });
}
