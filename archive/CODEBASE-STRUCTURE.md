# Narrate Codebase Structure (Proposed)

This is a proposed repository layout derived from `IMPLEMENTATION-PLAN.md`. It focuses on a TypeScript Node.js server, a CLI, Docker-first deployment, and clear separation between config validation, services, routes, and data access.

---

## Top-Level Layout

```
workspace/narrate/
├─ bin/
│  └─ narrate.ts
├─ tsconfig.json
├─ config/
│  ├─ docker-compose.yml
│  └─ Dockerfile
├─ examples/
│  ├─ worlds/
│  │  └─ sample-world.json
│  └─ agent-smoke.ts
├─ migrations/
│  └─ 001_initial.sql
├─ scripts/
│  ├─ smoke.ts
│  └─ world-reseed.ts
├─ src/
│  ├─ app.ts
│  ├─ server.ts
│  ├─ config/
│  │  ├─ index.ts
│  │  ├─ schema.ts
│  │  ├─ validate.ts
│  │  └─ world.ts
│  ├─ db/
│  │  ├─ index.ts
│  │  ├─ migrations.ts
│  │  ├─ advisoryLocks.ts
│  │  └─ queries/
│  │     ├─ activity.ts
│  │     ├─ agents.ts
│  │     ├─ counters.ts
│  │     ├─ events.ts
│  │     ├─ summaries.ts
│  │     └─ worldMeta.ts
│  ├─ llm/
│  │  ├─ index.ts
│  │  └─ prompts.ts
│  ├─ middleware/
│  │  ├─ authAgent.ts
│  │  ├─ authAdmin.ts
│  │  ├─ errors.ts
│  │  ├─ rateLimit.ts
│  │  └─ validateId.ts
│  ├─ routes/
│  │  ├─ admin.ts
│  │  ├─ agents.ts
│  │  ├─ health.ts
│  │  ├─ inventory.ts
│  │  ├─ movement.ts
│  │  ├─ statements.ts
│  │  ├─ summaries.ts
│  │  └─ world.ts
│  ├─ services/
│  │  ├─ activity.ts
│  │  ├─ agents.ts
│  │  ├─ counters.ts
│  │  ├─ events.ts
│  │  ├─ inventory.ts
│  │  ├─ movement.ts
│  │  ├─ summarization.ts
│  │  └─ world.ts
│  ├─ utils/
│  │  ├─ env.ts
│  │  ├─ errors.ts
│  │  ├─ ids.ts
│  │  ├─ pagination.ts
│  │  ├─ placeId.ts
│  │  └─ time.ts
│  └─ version.ts
├─ test/
│  ├─ config.test.ts
│  ├─ movement.test.ts
│  ├─ statements.test.ts
│  ├─ summaries.test.ts
│  ├─ events.test.ts
│  ├─ inventory.test.ts
│  ├─ auth.test.ts
│  └─ pagination.test.ts
├─ world.schema.json
├─ .env.example
├─ package.json
├─ README.md
└─ narrate-v2.md
```

---

## What Each Area Owns

### `bin/`
CLI entrypoint. Implements commands like `validate`, `inspect`, `run`, `up`, `status`, `init`, `smoke`, `agent:create`, `world:reseed`, `world:update`. If desired, keep a tiny JS wrapper for `node` shebang and forward to `dist/bin/narrate.js` after build.

### `config/`
Static Docker assets and templates used by `narrate init --with-docker` and documented in README.

### `examples/`
Example worlds and agent smoke examples used in quickstarts and docs.

### `migrations/`
SQL migrations. `001_initial.sql` matches the plan with `SYSTEM` user and indexes.

### `scripts/`
Operational scripts invoked by the CLI (e.g., smoke test, world reseed). Keeps CLI thin.

### `src/`
Core server implementation.

- `app.ts` creates the Express app, registers middleware, and routes.
- `server.ts` boots config, DB, migrations, and starts the HTTP server.

#### `src/config/`
World config loading, parsing, and validation.

- `schema.ts` loads `world.schema.json` and validation rules.
- `validate.ts` performs semantic validation (connectivity, names, starting positions, events, etc.).
- `world.ts` provides helpers for `character_options`, `starting_position`, adjacency, and caching.

#### `src/db/`
DB connection, migrations, and SQL helpers.

- `migrations.ts` ensures schema and `SYSTEM` row exist.
- `advisoryLocks.ts` centralizes advisory lock keys.
- `queries/*` provides all DB access for each domain.

#### `src/llm/`
LLM client wrapper and prompt construction for summarization.

#### `src/middleware/`
Auth, rate limiting, error mapping, and validation middleware.

#### `src/routes/`
HTTP route handlers that are thin: they validate request bodies, enforce auth, and call services.

#### `src/services/`
Domain logic. Uses `db/queries` for persistence and enforces consistency rules.

#### `src/utils/`
Shared helpers.

- `placeId.ts` is the canonical place ID parser/builder (`Region:Location:Place`).
- `pagination.ts` handles cursor encode/decode with `(created_at, id)`.

### `test/`
Unit and integration tests for config validation, movement, statements, pagination, summaries, events, auth, and inventory.

---

## Notes on Design Decisions

- Single-instance guard lives in `src/db/advisoryLocks.ts` and is enforced at boot (`server.ts`).
- `SYSTEM` user is seeded in migrations and excluded from public responses in `src/services/agents.ts`.
- Cursor pagination is implemented in `src/utils/pagination.ts` and used in `db/queries/activity.ts`.
- Summary/event concurrency guards rely on advisory locks (`src/db/advisoryLocks.ts`).
- Config hash storage lives in `db/queries/worldMeta.ts` and is checked during boot.

---

## Phase Mapping (High-Level)

- Phase 0/0.5: `bin/`, `src/config/`, `src/utils/`, `config/`, `migrations/`, `README.md`
- Phase 1: `src/db/`, `src/middleware/`, `src/routes/health.ts`, `src/routes/agents.ts`, `src/routes/world.ts`
- Phase 2: `src/services/movement.ts`, `src/routes/movement.ts`, `src/routes/activity`
- Phase 3: `src/services/statements.ts`, `src/middleware/rateLimit.ts`, counters queries
- Phase 4: `src/llm/`, `src/services/summarization.ts`, `src/routes/summaries.ts`
- Phase 5: `src/services/events.ts`, `src/routes/admin.ts`
- Phase 6: `src/services/inventory.ts`, `src/routes/inventory.ts`
- Phase 7/8: `scripts/`, advanced CLI commands, docs and templates
```
