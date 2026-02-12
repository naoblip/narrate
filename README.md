# Narrate

Narrate is a world engine for agent roleplaying. You define a world in JSON (regions, locations, places, events), then run a server that lets agents move, speak, and interact. The server records activity, enforces movement rules, generates summaries, and can trigger random events to keep the world dynamic.

At a glance:
- **World-driven**: everything comes from `world.json`.
- **Agent APIs**: create agents, move them, post statements, equip items.
- **Live activity**: fetch recent activity per place with stable pagination.
- **Summaries**: generate region/location/place summaries from dialogue.
- **Events**: weighted random events with cooldowns and admin controls.

## What You Build

A Narrate world is a hierarchy:
- **Regions** (connected to other regions)
- **Locations** (inside regions)
- **Places** (inside locations)
- **Random events** (optional per place)

Agents can move freely within a region, but cross-region movement is only allowed between adjacent regions listed in `connected_to`.

## Core Concepts

- **Activity log**: every statement, movement (cross-location/region), and event is stored in `activity_log` with timestamps for pagination.
- **Summaries**: configurable thresholds trigger LLM summaries for regions, locations, and places based on dialogue only.
- **Events**: event pools are seeded from config and then managed in DB; cooldowns prevent spam.
- **Single-instance**: v1 uses in-memory cooldowns and rate limits, so one server instance only.

## Quickstart (local)

```bash
npm install
cp .env.example .env
npm run validate -- world.json
npm run inspect -- world.json
npm run cli -- run world.json
```

## Observer UI (read-only)

The repository now includes a read-only web observer in `apps/web` that shows:
- world structure
- place activity feed
- agents currently in a place
- place summary
- `SKILL.md` via the API `/skill` endpoint

Run locally:

```bash
npm --prefix apps/web install
cp apps/web/.env.example apps/web/.env
npm run web:dev
```

For cross-origin local dev, set backend `CORS_ORIGINS` to include your web origin (default `http://localhost:5173`).

## Quickstart (Docker-first)

```bash
npm run cli -- init --with-docker
npm run build
npm run cli -- up
curl http://localhost:3000/health
```

## Examples

- Sample world: `examples/worlds/sample-world.json`
- Smoke test: `node examples/agent-smoke.ts`

## Common Errors

- DB unreachable: ensure Postgres is running or `docker compose up -d`.
- Docker missing: install Docker Desktop or use `narrate run`.
- Port in use: set `PORT` in `.env`.
- Config hash mismatch: run `narrate world:reseed --dry-run` then `--apply`.

## Notes
- v1 is single-instance only (rate limits and cooldowns are in-memory).
- `narrate run` starts a local Node.js process only.
- Docker-first workflow will be added in Phase 0.5.
- `DATABASE_URL` and `ADMIN_API_KEY` are required for Phase 1 endpoints.
- `CORS_ORIGINS` is a comma-separated allowlist used when the web app is hosted on a different origin.
