import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "bin/narrate.ts"],
  format: ["esm"],
  target: "node20",
  outDir: "dist",
  splitting: false,
  clean: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
});
