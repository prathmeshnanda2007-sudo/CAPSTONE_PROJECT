-- ============================================================
-- Phase 2 PostgreSQL Setup — Run AFTER initial prisma migrate
-- Village Data API — NeonDB performance indexes
-- ============================================================

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;       -- trigram text search
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- UUID generation

-- 2. Drop the default B-tree index on Village.name (Prisma created it)
--    and replace with a GIN trigram index for fast ILIKE / fuzzy search
DROP INDEX IF EXISTS "Village_name_idx";
CREATE INDEX IF NOT EXISTS idx_village_name_trgm
  ON "Village" USING GIN (name gin_trgm_ops);

-- 3. Composite index for state → district navigation
CREATE INDEX IF NOT EXISTS idx_state_name
  ON "State" (name);

-- 4. Partial index for active API keys only (most lookups filter by status)
CREATE INDEX IF NOT EXISTS idx_apikey_active
  ON "ApiKey" (key) WHERE status = 'Active';

-- 5. Index for pending user approvals (admin panel)
CREATE INDEX IF NOT EXISTS idx_user_status
  ON "User" (status, "createdAt" DESC);

-- Confirm
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
