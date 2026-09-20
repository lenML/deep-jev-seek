import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "es2022",
  platform: "node",
  noExternal: ["@lenml/jevseek"],
  clean: true,
  minify: true,
  sourcemap: true,
});
