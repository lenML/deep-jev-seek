import { readFile } from "node:fs/promises";

import {
  createJevSeek,
  DEFAULT_PROMPT_TEMPLATE,
  mapWithConcurrency,
} from "../packages/jevseek/dist/index.js";

const DEFAULT_DATASET =
  "https://raw.githubusercontent.com/fstandhartinger/jevbench/refs/heads/main/datasets/public/easy.jsonl";

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function numberOption(name, fallback) {
  const value = Number(option(name, fallback));
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return value;
}

async function readText(source) {
  if (!source.startsWith("http://") && !source.startsWith("https://")) {
    return readFile(source, "utf8");
  }
  const response = await fetch(source, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`dataset request failed: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function parseRows(text) {
  return text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`invalid JSONL at line ${index + 1}`, { cause: error });
      }
    });
}

function predictedAnswer(row, answer) {
  if (row.question.type === "noul") {
    return answer.noul >= 0.5 ? "yes" : "no";
  }
  return answer.choice;
}

function scoreRow(row, answer) {
  return {
    expected: String(row.expected).toLowerCase(),
    predicted: String(predictedAnswer(row, answer)).toLowerCase(),
  };
}

function summarize(outputs) {
  const correct = outputs.filter((item) => item.expected === item.predicted);
  const byFamily = new Map();
  for (const item of outputs) {
    const family = byFamily.get(item.family) ?? { correct: 0, total: 0 };
    family.total += 1;
    if (item.expected === item.predicted) {
      family.correct += 1;
    }
    byFamily.set(item.family, family);
  }
  return {
    accuracy: outputs.length === 0 ? 0 : correct.length / outputs.length,
    correct: correct.length,
    total: outputs.length,
    families: Object.fromEntries(
      [...byFamily].map(([name, value]) => [
        name,
        { ...value, accuracy: value.correct / value.total },
      ]),
    ),
    misses: outputs
      .filter((item) => item.expected !== item.predicted)
      .map(({ family, id, expected, predicted, sampledText }) => ({
        family,
        id,
        expected,
        predicted,
        sampledText,
      })),
  };
}

const datasetSource = option("--dataset", process.env.JEVBENCH_EASY ?? DEFAULT_DATASET);
const baseUrl = option("--base-url", process.env.LLAMACPP_BASE_URL ?? "http://127.0.0.1:8080/v1");
const model = option("--model", process.env.LLAMACPP_MODEL);
const concurrency = numberOption("--concurrency", 8);
const templateFile = option("--template-file");
const template = templateFile ? await readFile(templateFile, "utf8") : DEFAULT_PROMPT_TEMPLATE;
const rows = parseRows(await readText(datasetSource));
const client = createJevSeek({
  provider: "llamacpp",
  baseUrl,
  ...(model ? { model } : {}),
  timeoutMs: 120_000,
  retry: { maxAttempts: 1 },
  promptTemplate: template,
});
const startedAt = performance.now();
const results = await mapWithConcurrency(rows, concurrency, async (row) => {
  try {
    const response = await client.systemOne({
      state: row.state,
      questions: { decision: row.question },
      debug: true,
    });
    const answer = response.answers.decision;
    return {
      ...scoreRow(row, answer),
      family: row.family,
      id: row.id,
      sampledText: response.diagnostics.questions.decision.sampledText,
    };
  } catch (error) {
    return {
      family: row.family,
      id: row.id,
      expected: String(row.expected).toLowerCase(),
      predicted: "<error>",
      sampledText: error instanceof Error ? error.message : String(error),
    };
  }
});
const report = {
  provider: "llamacpp",
  baseUrl,
  model: model ?? client.model,
  dataset: datasetSource,
  durationMs: Math.round(performance.now() - startedAt),
  ...summarize(results),
};
console.log(JSON.stringify(report, null, 2));
if (report.misses.some((miss) => miss.predicted === "<error>")) {
  process.exitCode = 1;
}
