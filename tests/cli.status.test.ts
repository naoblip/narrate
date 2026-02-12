import { describe, expect, it, vi } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const tsxBin = path.resolve(repoRoot, "node_modules", ".bin", "tsx");
const cliPath = path.resolve(repoRoot, "bin", "narrate.ts");

const dbMockPath = path.resolve(repoRoot, "tests", "db-mocks", "pool-ok.cjs");


describe("narrate status", () => {
  it("prints world hash when DB is reachable", () => {
    const result = spawnSync(tsxBin, [cliPath, "status"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        DATABASE_URL: "postgres://example",
        NODE_OPTIONS: `--require ${dbMockPath}`,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("DB: ok");
    expect(result.stdout).toContain("World hash:");
  });
});
