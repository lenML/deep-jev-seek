import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";

const DEFAULT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".mjs",
  ".scss",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const IGNORED_DIRECTORIES = new Set([
  ".fetch-cache",
  ".git",
  ".vite",
  "coverage",
  "dist",
  "node_modules",
]);

const IGNORED_FILES = new Set(["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]);

function parseArguments(argv) {
  const options = {
    failOver: false,
    json: false,
    limit: 50,
    sort: "lines",
    threshold: 250,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--json") {
      options.json = true;
    } else if (argument === "--fail-over") {
      options.failOver = true;
    } else if (argument === "--sort") {
      options.sort = argv[index + 1];
      index += 1;
    } else if (argument === "--limit") {
      options.limit = Number(argv[index + 1]);
      index += 1;
    } else if (argument === "--threshold") {
      options.threshold = Number(argv[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (options.sort !== "lines" && options.sort !== "chars") {
    throw new Error("--sort must be lines or chars");
  }
  if (!Number.isInteger(options.limit) || options.limit < 1) {
    throw new Error("--limit must be a positive integer");
  }
  if (!Number.isInteger(options.threshold) || options.threshold < 0) {
    throw new Error("--threshold must be a non-negative integer");
  }

  return options;
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        files.push(...(await collectFiles(path)));
      }
      continue;
    }

    if (
      entry.isFile() &&
      !IGNORED_FILES.has(entry.name) &&
      DEFAULT_EXTENSIONS.has(extname(entry.name))
    ) {
      files.push(path);
    }
  }

  return files;
}

function countLines(content) {
  return content.length === 0 ? 0 : content.split(/\r?\n/u).length;
}

function pad(value, width) {
  return String(value).padEnd(width, " ");
}

function formatNumber(value) {
  return value.toLocaleString("en-US");
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const root = process.cwd();
  const paths = await collectFiles(root);
  const records = await Promise.all(
    paths.map(async (path) => {
      const content = await readFile(path, "utf8");
      return {
        chars: content.length,
        lines: countLines(content),
        overThreshold: countLines(content) >= options.threshold,
        path: relative(root, path).replaceAll("\\", "/"),
      };
    }),
  );

  records.sort((left, right) => {
    const primary = options.sort === "lines" ? right.lines - left.lines : right.chars - left.chars;
    if (primary !== 0) {
      return primary;
    }
    return options.sort === "lines" ? right.chars - left.chars : right.lines - left.lines;
  });

  const visible = records.slice(0, options.limit);
  const totalLines = records.reduce((total, record) => total + record.lines, 0);
  const totalChars = records.reduce((total, record) => total + record.chars, 0);
  const overThreshold = records.filter((record) => record.overThreshold);

  if (options.json) {
    console.log(
      JSON.stringify(
        {
          files: visible,
          options,
          summary: {
            files: records.length,
            overThreshold: overThreshold.length,
            totalChars,
            totalLines,
          },
        },
        null,
        2,
      ),
    );
  } else {
    console.log(
      `Code size: ${formatNumber(records.length)} files, ${formatNumber(totalLines)} lines, ${formatNumber(totalChars)} chars`,
    );
    console.log(
      `Sort: ${options.sort} | Threshold: ${formatNumber(options.threshold)} lines | Over: ${formatNumber(overThreshold.length)}`,
    );
    console.log("");
    console.log(`${pad("LINES", 10)} ${pad("CHARS", 12)} ${pad("STATE", 7)} FILE`);
    console.log(`${"-".repeat(10)} ${"-".repeat(12)} ${"-".repeat(7)} ${"-".repeat(40)}`);

    for (const record of visible) {
      console.log(
        `${pad(formatNumber(record.lines), 10)} ${pad(formatNumber(record.chars), 12)} ${pad(record.overThreshold ? "OVER" : "ok", 7)} ${record.path}`,
      );
    }

    if (overThreshold.length > 0) {
      console.log("");
      console.log(`Over threshold: ${overThreshold.map((record) => record.path).join(", ")}`);
    }
  }

  if (options.failOver && overThreshold.length > 0) {
    process.exitCode = 1;
  }
}

await main();
