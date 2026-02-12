import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { makeTempDir, minimalWorld, writeJson } from "./helpers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const tsxBin = path.resolve(repoRoot, "node_modules", ".bin", "tsx");
const cliPath = path.resolve(repoRoot, "bin", "narrate.ts");

function runCli(args: string[], cwd: string) {
  const result = spawnSync(tsxBin, [cliPath, ...args], {
    cwd,
    encoding: "utf8",
  });
  return {
    code: result.status ?? 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

describe("narrate CLI", () => {
  it("validate returns 0 for valid world", () => {
    const dir = makeTempDir();
    const worldPath = path.join(dir, "world.json");
    writeJson(worldPath, minimalWorld());

    const result = runCli(["validate", worldPath], dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Validation OK");
  });

  it("validate returns 1 for invalid world", () => {
    const dir = makeTempDir();
    const world = minimalWorld();
    world.starting_position.place = "Missing";
    const worldPath = path.join(dir, "world.json");
    writeJson(worldPath, world);

    const result = runCli(["validate", worldPath], dir);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Validation failed");
  });

  it("inspect prints counts", () => {
    const dir = makeTempDir();
    const worldPath = path.join(dir, "world.json");
    writeJson(worldPath, minimalWorld());

    const result = runCli(["inspect", worldPath], dir);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Regions:");
    expect(result.stdout).toContain("Locations:");
    expect(result.stdout).toContain("Places:");
    expect(result.stdout).toContain("Events:");
  });

  it("run fails fast without DATABASE_URL", () => {
    const dir = makeTempDir();
    const worldPath = path.join(dir, "world.json");
    writeJson(worldPath, minimalWorld());

    const result = spawnSync(
      tsxBin,
      [cliPath, "run", worldPath],
      {
        cwd: dir,
        encoding: "utf8",
        env: { ...process.env, DATABASE_URL: "" },
      }
    );

    expect(result.status).toBe(1);
    expect((result.stderr || "").toString()).toContain("DATABASE_URL is required");
  });
});
