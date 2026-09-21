import { parseBenchmarkDataset } from "./parser";
import { normalizeBenchmarkUrl } from "./sources";
import type { BenchmarkDataset, BenchmarkSource } from "./types";

const datasetCache = new Map<string, BenchmarkDataset>();
const datasetRequests = new Map<string, Promise<BenchmarkDataset>>();

export function loadBenchmarkDataset(
  source: BenchmarkSource,
  fetchImpl: typeof fetch = fetch,
): Promise<BenchmarkDataset> {
  const cached = datasetCache.get(source.id);
  if (cached) {
    return Promise.resolve(cached);
  }

  const pending = datasetRequests.get(source.id);
  if (pending) {
    return pending;
  }

  const request = fetchImpl(normalizeBenchmarkUrl(source.url), {
    headers: {
      Accept: "application/json, text/plain, text/csv, */*",
    },
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`${source.name} request failed: HTTP ${response.status}`);
      }
      return parseBenchmarkDataset(await response.text(), source);
    })
    .then((dataset) => {
      datasetCache.set(source.id, dataset);
      return dataset;
    })
    .catch((error: unknown) => {
      datasetRequests.delete(source.id);
      throw error;
    });

  datasetRequests.set(source.id, request);
  return request;
}

export function clearBenchmarkDatasetCache() {
  datasetCache.clear();
  datasetRequests.clear();
}
