import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { makeTempDir } from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const tsxBin = path.resolve(repoRoot, "node_modules", ".bin", "tsx");
const cliPath = path.resolve(repoRoot, "bin", "narrate.ts");

describe("narrate init", () => {
  it("creates world.json and .env", () => {
    const dir = makeTempDir();
    const result = spawnSync(tsxBin, [cliPath, "init", "--dir", dir], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(dir, "world.json"))).toBe(true);
    expect(fs.existsSync(path.join(dir, ".env"))).toBe(true);
  });

  it("writes docker-compose.yml with --with-docker", () => {
    const dir = makeTempDir();
    const result = spawnSync(tsxBin, [cliPath, "init", "--dir", dir, "--with-docker"], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(dir, "docker-compose.yml"))).toBe(true);
  });
});
