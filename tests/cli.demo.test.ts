import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { makeTempDir } from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const tsxBin = path.resolve(repoRoot, "node_modules", ".bin", "tsx");
const cliPath = path.resolve(repoRoot, "bin", "narrate.ts");

const fakeNodePath = path.resolve(repoRoot, "tests", "fake-node.cjs");

describe("narrate demo", () => {
  it("runs init, up, and agent:create", () => {
    const dir = makeTempDir();
    const result = spawnSync(tsxBin, [cliPath, "demo", "--dir", dir], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        NODE_OPTIONS: `--require ${fakeNodePath}`,
      },
    });

    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain("FAKE NODE");
  });
});
