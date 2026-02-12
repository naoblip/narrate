#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { Command } from "commander";
import { validateWorldConfig, inspectWorldConfig } from "../src/config/validate";

const program = new Command();

program
  .name("narrate")
  .description("Narrate CLI")
  .version("0.1.0");

program
  .command("validate")
  .argument("[world]", "path to world.json", "world.json")
  .description("Validate a world config")
  .action((worldPath) => {
    const resolved = path.resolve(process.cwd(), worldPath);
    if (!fs.existsSync(resolved)) {
      console.error(`World file not found: ${resolved}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(resolved, "utf8");
    const parsed = JSON.parse(raw);
    const { ok, issues } = validateWorldConfig(parsed);
    if (!ok) {
      console.error("Validation failed:");
      for (const issue of issues) {
        console.error(`- ${issue.field}: ${issue.issue}`);
      }
      process.exit(1);
    }
    console.log("Validation OK");
  });

program
  .command("inspect")
  .argument("[world]", "path to world.json", "world.json")
  .description("Inspect a world config")
  .action((worldPath) => {
    const resolved = path.resolve(process.cwd(), worldPath);
    if (!fs.existsSync(resolved)) {
      console.error(`World file not found: ${resolved}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(resolved, "utf8");
    const parsed = JSON.parse(raw);
    const { ok, issues, value } = validateWorldConfig(parsed);
    if (!ok || !value) {
      console.error("Validation failed:");
      for (const issue of issues) {
        console.error(`- ${issue.field}: ${issue.issue}`);
      }
      process.exit(1);
    }
    const summary = inspectWorldConfig(value);
    console.log(`Regions: ${summary.regionCount}`);
    console.log(`Locations: ${summary.locationCount}`);
    console.log(`Places: ${summary.placeCount}`);
    console.log(`Events: ${summary.eventCount}`);
  });

program
  .command("run")
  .argument("[world]", "path to world.json", "world.json")
  .description("Run the local Narrate server")
  .action((worldPath) => {
    const resolved = path.resolve(process.cwd(), worldPath);
    process.env.NARRATE_WORLD = resolved;
    import("../src/server");
  });

program
  .command("agent:create")
  .description("Create an agent via the running Narrate server")
  .option("--name <name>", "agent name")
  .option("--species <species>", "agent species")
  .option("--traits <traits>", "comma-separated traits")
  .action(async (options) => {
    const baseUrl = process.env.NARRATE_URL || "http://localhost:3000";
    const name = options.name || "Agent";
    const species = options.species || "Human";
    const traits = typeof options.traits === "string"
      ? options.traits.split(",").map((t: string) => t.trim()).filter(Boolean)
      : [];
    const payload = { name, species, traits: traits.length ? traits : ["Curious"] };

    const res = await fetch(`${baseUrl}/api/agents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(await res.text());
      process.exit(1);
    }

    const data = await res.json();
    console.log("Agent created:", data.agent.id);
    console.log("API key (save this now):", data.api_key);
    console.log(
      `Try: curl -X POST ${baseUrl}/api/agents/${data.agent.id}/statements -H \"Authorization: Bearer ${data.api_key}\" -H \"Content-Type: application/json\" -d '{\"statement\":\"Hello\"}'`
    );
  });

program
  .command("init")
  .option("--with-docker", "write docker-compose.yml")
  .option("--dir <dir>", "output directory", ".")
  .option("--force", "overwrite existing files")
  .description("Initialize a new Narrate world in a directory")
  .action((options) => {
    const dir = path.resolve(process.cwd(), options.dir);
    const files = [
      { name: "world.json", src: path.resolve(process.cwd(), "world.json") },
      { name: ".env", src: path.resolve(process.cwd(), ".env.example") },
    ];
    for (const file of files) {
      const target = path.join(dir, file.name);
      if (fs.existsSync(target) && !options.force) {
        console.error(`Refusing to overwrite ${target} (use --force)`);
        process.exit(1);
      }
    }

    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(path.resolve(process.cwd(), "world.json"), path.join(dir, "world.json"));

    const envTemplate = fs.readFileSync(path.resolve(process.cwd(), ".env.example"), "utf8");
    const adminKey = randomBytes(24).toString("base64url");
    const envOut = envTemplate.replace(
      /^ADMIN_API_KEY=.*$/m,
      `ADMIN_API_KEY=${adminKey}`
    );
    fs.writeFileSync(path.join(dir, ".env"), envOut);

    if (options.withDocker) {
      const dockerSrc = path.resolve(process.cwd(), "config", "docker-compose.yml");
      fs.copyFileSync(dockerSrc, path.join(dir, "docker-compose.yml"));
    }

    console.log("Initialized Narrate in", dir);
    console.log("Generated ADMIN_API_KEY:", adminKey);
  });

program
  .command("up")
  .description("Start docker compose stack")
  .action(async () => {
    const { spawnSync } = await import("node:child_process");
    const result = spawnSync("docker", ["compose", "up", "-d"], { stdio: "inherit" });
    if (result.status !== 0) {
      process.exit(result.status ?? 1);
    }
  });

program
  .command("status")
  .description("Check DB connectivity and world hash")
  .action(async () => {
    const { pool } = await import("../src/db");
    try {
      await pool.query("SELECT 1");
      console.log("DB: ok");
      const { rows } = await pool.query("SELECT world_config_hash FROM world_meta WHERE id = 1");
      console.log("World hash:", rows[0]?.world_config_hash ?? "missing");
    } catch (err) {
      console.error("DB: unreachable");
      process.exit(1);
    }
  });

program
  .command("doctor")
  .description("Check env and DB connectivity")
  .action(async () => {
    const missing = [];
    if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
    if (!process.env.ADMIN_API_KEY) missing.push("ADMIN_API_KEY");
    if (missing.length) {
      console.error("Missing env:", missing.join(", "));
    }
    const { pool } = await import("../src/db");
    try {
      await pool.query("SELECT 1");
      console.log("DB: ok");
    } catch {
      console.error("DB: unreachable");
      process.exit(1);
    }
  });

program
  .command("smoke")
  .description("Run a basic smoke test against a running server")
  .action(async () => {
    await import("../scripts/smoke");
  });

program
  .command("world:reseed")
  .argument("[world]", "path to world.json", "world.json")
  .option("--apply", "apply reseed changes")
  .option("--from <path>", "path to previous world.json for diff")
  .description("Reseed derived tables based on world config")
  .action(async (worldPath, options) => {
    const args = [process.argv[0], process.argv[1], worldPath];
    if (options.apply) args.push("--apply");
    if (options.from) args.push("--from", options.from);
    process.argv = args;
    if (!options.apply) {
      console.error("Dry-run only. Re-run with --apply to apply changes.");
    }
    await import("../scripts/world-reseed");
  });

program
  .command("demo")
  .option("--dir <dir>", "output directory", ".")
  .description("One-shot demo: init, up, agent:create")
  .action(async (options) => {
    const { spawnSync } = await import("node:child_process");
    const dir = path.resolve(process.cwd(), options.dir);

    const initArgs = [process.argv[1], "init", "--with-docker", "--dir", dir];
    const initRes = spawnSync(process.execPath, initArgs, { stdio: "inherit" });
    if (initRes.status !== 0) process.exit(initRes.status ?? 1);

    const upRes = spawnSync(process.execPath, [process.argv[1], "up"], { cwd: dir, stdio: "inherit" });
    if (upRes.status !== 0) process.exit(upRes.status ?? 1);

    const agentRes = spawnSync(process.execPath, [process.argv[1], "agent:create"], { cwd: dir, stdio: "inherit" });
    if (agentRes.status !== 0) process.exit(agentRes.status ?? 1);
  });

program.parse(process.argv);
