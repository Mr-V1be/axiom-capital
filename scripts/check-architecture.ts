import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = new URL("../", import.meta.url).pathname;
const ignored = new Set([
  "node_modules",
  "dist",
  "coverage",
  ".git",
  ".next",
  ".open-next",
  ".wrangler",
  ".playwright-mcp",
  "generated",
]);
const sourceExtensions = new Set([".ts", ".tsx", ".css", ".prisma"]);
const violations: string[] = [];

async function inspect(directory: string): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries.filter((entry) =>
    entry.isFile() && sourceExtensions.has(extname(entry.name))
  );

  if (files.length > 7) {
    violations.push(`${relative(root, directory)} contains ${files.length} files`);
  }

  await Promise.all(
    files.map(async (file) => {
      const path = join(directory, file.name);
      const lines = (await readFile(path, "utf8")).split("\n").length;
      if (lines > 250) {
        violations.push(`${relative(root, path)} contains ${lines} lines`);
      }
    }),
  );

  await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && !ignored.has(entry.name))
      .map((entry) => inspect(join(directory, entry.name))),
  );
}

await inspect(root);

if (violations.length > 0) {
  throw new Error(`Architecture constraints failed:\n${violations.join("\n")}`);
}

console.info("Architecture constraints passed.");
