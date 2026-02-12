import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { makeTempDir, minimalWorld, writeJson } from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const tsxBin = path.resolve(repoRoot, "node_modules", ".bin", "tsx");
const cliPath = path.resolve(repoRoot, "bin", "narrate.ts");

const dbMockPath = path.resolve(repoRoot, "tests", "db-mocks", "pool-ok.cjs");


describe("narrate world:reseed", () => {
  it("warns when running dry-run", () => {
    const dir = makeTempDir();
    const worldPath = path.join(dir, "world.json");
    writeJson(worldPath, minimalWorld());

    const result = spawnSync(tsxBin, [cliPath, "world:reseed", worldPath], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_OPTIONS: `--require ${dbMockPath}`,
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Dry-run only");
  });
});
