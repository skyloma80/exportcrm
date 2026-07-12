/**
 * Build page-agent production IIFE bundle from local ESM sources.
 * Run after `npm install page-agent` updates.
 *
 * Usage: node scripts/build-page-agent.mjs
 */
import * as esbuild from "esbuild";
import { existsSync, statSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENTRY = resolve(ROOT, "node_modules/page-agent/dist/esm/page-agent.js");
const OUT = resolve(ROOT, "node_modules/page-agent/dist/iife/page-agent.js");

if (!existsSync(ENTRY)) {
  console.error("page-agent ESM entry not found. Run `npm install page-agent` first.");
  process.exit(1);
}

const result = await esbuild.build({
  entryPoints: [ENTRY],
  bundle: true,
  format: "iife",
  globalName: "PageAgent",
  outfile: OUT,
  minify: true,
  sourcemap: false,
  target: "es2020",
  platform: "browser",
  external: ["zod"],
  footer: { js: "window.PageAgent = PageAgent.PageAgent;" },
});

const size = statSync(OUT).size;
console.log(`page-agent production IIFE built: ${OUT}`);
console.log(`  size: ${(size / 1024).toFixed(1)} KB`);
