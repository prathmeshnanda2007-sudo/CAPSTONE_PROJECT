import os
import sys
import random
import logging
from pathlib import Path

import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).parent.parent / 'api' / '.env')
DB_URL = os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL')

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
log = logging.getLogger(__name__)

EXPECTED = {
    'states':        36,
    'districts':     700,
    'sub_districts': 6000,
    'villages':      600000,
}

PASS = "✅"
WARN = "⚠️ "
FAIL = "❌"


def get_connection():
    if not DB_URL or 'file:' in DB_URL:
        log.error("Set DIRECT_URL (NeonDB direct connection) in api/.env")
        sys.exit(1)
    return psycopg2.connect(DB_URL)


def verify(conn):
    cur = conn.cursor(cursor_factory=RealDictCursor)
    all_passed = True

    log.info("=" * 60)
    log.info("IMPORT VERIFICATION REPORT")
    log.info("=" * 60)

    # ── 1. Row counts ────────────────────────────────────────────────────────
    log.info("\n── 1. Record Counts ──")
    counts = {}
    for table, model in [('State', 'states'), ('District', 'districts'),
                         ('SubDistrict', 'sub_districts'), ('Village', 'villages')]:
        cur.execute(f'SELECT COUNT(*) AS cnt FROM "{table}"')
        cnt = cur.fetchone()['cnt']
        counts[model] = cnt
        expected = EXPECTED[model]
        icon = PASS if cnt >= expected else WARN
        log.info(f"  {icon} {table}: {cnt:,} (expected ≥ {expected:,})")
        if cnt < expected:
            all_passed = False

    # ── 2. Orphan check ──────────────────────────────────────────────────────
    log.info("\n── 2. Orphaned Records ──")
    orphan_queries = [
        ('Districts without valid State',
         'SELECT COUNT(*) AS cnt FROM "District" d WHERE NOT EXISTS (SELECT 1 FROM "State" s WHERE s.id = d."stateId")'),
        ('SubDistricts without valid District',
         'SELECT COUNT(*) AS cnt FROM "SubDistrict" sd WHERE NOT EXISTS (SELECT 1 FROM "District" d WHERE d.id = sd."districtId")'),
        ('Villages without valid SubDistrict',
         'SELECT COUNT(*) AS cnt FROM "Village" v WHERE NOT EXISTS (SELECT 1 FROM "SubDistrict" sd WHERE sd.id = v."subDistrictId")'),
    ]
    for label, query in orphan_queries:
        cur.execute(query)
        cnt = cur.fetchone()['cnt']
        icon = PASS if cnt == 0 else FAIL
        log.info(f"  {icon} {label}: {cnt:,}")
        if cnt > 0:
            all_passed = False

    # ── 3. Duplicate codes ───────────────────────────────────────────────────
    log.info("\n── 3. Duplicate Code Check ──")
    dup_queries = [
        ('Duplicate State codes',    'SELECT COUNT(*) AS cnt FROM (SELECT code FROM "State" GROUP BY code HAVING COUNT(*) > 1) t'),
        ('Duplicate District codes', 'SELECT COUNT(*) AS cnt FROM (SELECT code FROM "District" GROUP BY code HAVING COUNT(*) > 1) t'),
        ('Duplicate Village codes',  'SELECT COUNT(*) AS cnt FROM (SELECT code FROM "Village" GROUP BY code HAVING COUNT(*) > 1) t'),
    ]
    for label, query in dup_queries:
        cur.execute(query)
        cnt = cur.fetchone()['cnt']
        icon = PASS if cnt == 0 else FAIL
        log.info(f"  {icon} {label}: {cnt:,}")
        if cnt > 0:
            all_passed = False

    # ── 4. Random hierarchy spot checks ─────────────────────────────────────
    log.info("\n── 4. Random Hierarchy Spot Checks (5 villages) ──")
    cur.execute("""
        SELECT
            v.name  AS village,
            v.code  AS village_code,
            sd.name AS sub_district,
            d.name  AS district,
            s.name  AS state
        FROM "Village" v
        JOIN "SubDistrict" sd ON sd.id = v."subDistrictId"
        JOIN "District"    d  ON d.id  = sd."districtId"
        JOIN "State"       s  ON s.id  = d."stateId"
        ORDER BY RANDOM()
        LIMIT 5
    """)
    rows = cur.fetchall()
    for row in rows:
        addr = f"{row['village']}, {row['sub_district']}, {row['district']}, {row['state']}, India"
        log.info(f"  {PASS} {addr}")
    if len(rows) == 0:
        log.warning(f"  {WARN} No villages found — data may not be imported")
        all_passed = False

    # ── 5. Top states by village count ───────────────────────────────────────
    log.info("\n── 5. Top 5 States by Village Count ──")
    cur.execute("""
        SELECT s.name AS state, COUNT(v.id) AS village_count
        FROM "Village" v
        JOIN "SubDistrict" sd ON sd.id = v."subDistrictId"
        JOIN "District"    d  ON d.id  = sd."districtId"
        JOIN "State"       s  ON s.id  = d."stateId"
        GROUP BY s.name
        ORDER BY village_count DESC
        LIMIT 5
    """)
    for row in cur.fetchall():
        log.info(f"  {PASS} {row['state']}: {row['village_count']:,} villages")

    # ── 6. Full-text search spot check ───────────────────────────────────────
    log.info("\n── 6. Search Test (ILIKE 'delhi') ──")
    cur.execute("""
        SELECT COUNT(*) AS cnt FROM "Village" WHERE name ILIKE '%delhi%'
    """)
    delhi_cnt = cur.fetchone()['cnt']
    log.info(f"  {PASS if delhi_cnt > 0 else WARN} Villages matching 'delhi': {delhi_cnt:,}")

    # ── 7. Trigram index check ───────────────────────────────────────────────
    log.info("\n── 7. GIN Trigram Index Check ──")
    cur.execute("""
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'Village' AND indexdef LIKE '%gin%'
    """)
    trgm_indexes = cur.fetchall()
    if trgm_indexes:
        for idx in trgm_indexes:
            log.info(f"  {PASS} {idx['indexname']}: {idx['indexdef'][:60]}...")
    else:
        log.warning(f"  {WARN} No GIN trigram index found. Run: npx prisma db execute --file scripts/setup_indexes.sql")

    cur.close()

    # ── Final result ─────────────────────────────────────────────────────────
    log.info("\n" + "=" * 60)
    if all_passed:
        log.info(f"{PASS} ALL CHECKS PASSED — Data import is verified!")
    else:
        log.warning(f"{WARN} SOME CHECKS FAILED — Review issues above")
    log.info("=" * 60)


if __name__ == "__main__":
    conn = get_connection()
    try:
        verify(conn)
    finally:
        conn.close()
