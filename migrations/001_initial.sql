-- NOTE: Do NOT require pgcrypto by default. Managed Postgres often blocks CREATE EXTENSION.
-- All UUIDs should be generated in the app for v1 unless the operator explicitly enables
-- pgcrypto and opts into DB-side UUID generation.

CREATE TABLE characters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  name_key TEXT UNIQUE NOT NULL,
  species TEXT NOT NULL,
  traits JSONB NOT NULL CHECK (jsonb_typeof(traits) = 'array'),
  inv_head TEXT,
  inv_neck TEXT,
  inv_body TEXT,
  inv_legs TEXT,
  inv_hands TEXT,
  inv_feet TEXT,
  inv_ring TEXT,
  inv_left_hand TEXT,
  inv_right_hand TEXT,
  region TEXT NOT NULL,
  location TEXT NOT NULL,
  place TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uniq_char_name_key ON characters(name_key);

CREATE TABLE api_keys (
  id BIGSERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE agent_webhooks (
  agent_id TEXT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activity_log (
  -- UUIDv4; rely on (created_at, id) composite ordering for stable pagination.
  -- UUIDs are generated in the app by default (no pgcrypto dependency).
  id UUID PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES characters(id),
  statement TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  region TEXT NOT NULL,
  location TEXT NOT NULL,
  place TEXT NOT NULL,
  shared_with JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(shared_with) = 'array'),
  activity_type TEXT NOT NULL DEFAULT 'dialogue' CHECK (activity_type IN ('dialogue', 'movement', 'event'))
);

CREATE TABLE area_summaries (
  id BIGSERIAL PRIMARY KEY,
  area_type TEXT NOT NULL CHECK (area_type IN ('region', 'location', 'place')),
  region TEXT NOT NULL,
  location TEXT,
  place TEXT,
  summary TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activity_count INTEGER NOT NULL,
  source_statements JSONB NOT NULL CHECK (jsonb_typeof(source_statements) = 'array'),
  history JSONB NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(history) = 'array')
);

CREATE TABLE place_events (
  id BIGSERIAL PRIMARY KEY,
  region TEXT NOT NULL,
  location TEXT NOT NULL,
  place TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_text TEXT NOT NULL,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_available TIMESTAMPTZ
);

CREATE TABLE place_event_pool (
  id BIGSERIAL PRIMARY KEY,
  region TEXT NOT NULL,
  location TEXT NOT NULL,
  place TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_text TEXT NOT NULL,
  weight INTEGER NOT NULL CHECK (weight > 0),
  cooldown_seconds INTEGER NOT NULL CHECK (cooldown_seconds >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (region, location, place, event_id)
);

CREATE TABLE world_meta (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  world_config_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE area_counters (
  id BIGSERIAL PRIMARY KEY,
  area_type TEXT NOT NULL CHECK (area_type IN ('region', 'location', 'place')),
  region TEXT NOT NULL,
  location TEXT,
  place TEXT,
  statements_since_summary INTEGER NOT NULL DEFAULT 0,
  statements_since_event INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_char_position ON characters(region, location, place);
CREATE INDEX idx_activity_by_agent ON activity_log(agent_id, created_at DESC);
CREATE INDEX idx_activity_by_area ON activity_log(region, location, place, created_at DESC);
CREATE INDEX idx_shared_with ON activity_log USING GIN (shared_with);
CREATE INDEX idx_events_by_place ON place_events(region, location, place, triggered_at DESC);
CREATE INDEX idx_event_pool_by_place ON place_event_pool(region, location, place);
CREATE UNIQUE INDEX uniq_summary_region ON area_summaries(region) WHERE area_type = 'region';
CREATE UNIQUE INDEX uniq_summary_location ON area_summaries(region, location) WHERE area_type = 'location';
CREATE UNIQUE INDEX uniq_summary_place ON area_summaries(region, location, place) WHERE area_type = 'place';
CREATE UNIQUE INDEX uniq_counter_region ON area_counters(region) WHERE area_type = 'region';
CREATE UNIQUE INDEX uniq_counter_location ON area_counters(region, location) WHERE area_type = 'location';
CREATE UNIQUE INDEX uniq_counter_place ON area_counters(region, location, place) WHERE area_type = 'place';
CREATE UNIQUE INDEX uniq_active_key_per_agent ON api_keys(agent_id) WHERE revoked_at IS NULL;

-- Seed SYSTEM user (idempotent).
INSERT INTO characters (id, name, name_key, species, traits, region, location, place)
VALUES ('SYSTEM', 'SYSTEM', 'system', 'system', '[]', 'SYSTEM', 'SYSTEM', 'SYSTEM')
ON CONFLICT (id) DO NOTHING;
