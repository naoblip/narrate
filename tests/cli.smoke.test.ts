import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const tsxBin = path.resolve(repoRoot, "node_modules", ".bin", "tsx");
const cliPath = path.resolve(repoRoot, "bin", "narrate.ts");
const fetchMockPath = path.resolve(repoRoot, "tests", "fetch-mock.cjs");


describe("narrate smoke", () => {
  it("runs smoke script", () => {
    const result = spawnSync(tsxBin, [cliPath, "smoke"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_OPTIONS: `--require ${fetchMockPath}`,
      },
    });

    expect(result.status).toBe(0);
  });
});
