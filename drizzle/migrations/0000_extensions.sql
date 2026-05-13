-- Required Postgres extensions for the MCG support stack.
-- Run before any other migration that references citext / vector / pg_trgm.
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;
