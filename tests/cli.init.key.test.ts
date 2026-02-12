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

describe("narrate init key generation", () => {
  it("writes ADMIN_API_KEY into .env", () => {
    const dir = makeTempDir();
    const result = spawnSync(tsxBin, [cliPath, "init", "--dir", dir], {
      cwd: repoRoot,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    const envPath = path.join(dir, ".env");
    const envContent = fs.readFileSync(envPath, "utf8");
    const match = envContent.match(/^ADMIN_API_KEY=(.+)$/m);
    expect(match).toBeTruthy();
    expect(match?.[1]?.length).toBeGreaterThan(10);
  });
});
