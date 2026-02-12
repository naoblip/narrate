import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const tsxBin = path.resolve(repoRoot, "node_modules", ".bin", "tsx");
const cliPath = path.resolve(repoRoot, "bin", "narrate.ts");

describe("narrate agent:create", () => {
  it("prints agent id and api key", () => {
    const fetchMockPath = path.resolve(repoRoot, "tests", "fetch-mock.cjs");
    const result = spawnSync(tsxBin, [cliPath, "agent:create", "--name", "Ava"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NARRATE_URL: "http://localhost:3000",
        NODE_OPTIONS: `--require ${fetchMockPath}`,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Agent created:");
    expect(result.stdout).toContain("API key");
  });
});
