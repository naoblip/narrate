import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const tsxBin = path.resolve(repoRoot, "node_modules", ".bin", "tsx");
const cliPath = path.resolve(repoRoot, "bin", "narrate.ts");

const dbMockPath = path.resolve(repoRoot, "tests", "db-mocks", "pool-ok.cjs");


describe("narrate doctor", () => {
  it("warns for missing env but still reports DB ok", () => {
    const result = spawnSync(tsxBin, [cliPath, "doctor"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_OPTIONS: `--require ${dbMockPath}`,
      },
    });

    expect(result.stdout + result.stderr).toContain("Missing env");
    expect(result.stdout + result.stderr).toContain("DB: ok");
  });
});
