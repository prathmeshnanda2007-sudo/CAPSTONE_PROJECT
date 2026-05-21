import os
import sys
import uuid
import time
import csv
import logging
from datetime import datetime
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# ─── Setup ────────────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=Path(__file__).parent.parent / 'api' / '.env')
DB_URL = os.getenv('DATABASE_URL') or os.getenv('DIRECT_URL')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f'import_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
    ]
)
log = logging.getLogger(__name__)

# ─── Summary counters ─────────────────────────────────────────────────────────
SUMMARY = {
    'states': 0, 'districts': 0, 'sub_districts': 0,
    'villages_total': 0, 'villages_inserted': 0, 'villages_failed': 0,
    'failed_rows': []
}

FAILED_CSV = f'failed_rows_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'


def get_connection(retries=5, delay=2):
    """Connect to PostgreSQL with retry logic."""
    if not DB_URL:
        log.error("DATABASE_URL or DIRECT_URL not set in api/.env")
        sys.exit(1)
    if 'file:' in DB_URL or 'sqlite' in DB_URL.lower():
        log.error("DATABASE_URL points to SQLite. Set NeonDB PostgreSQL URL in api/.env")
        sys.exit(1)
    for attempt in range(1, retries + 1):
        try:
            conn = psycopg2.connect(DB_URL)
            log.info(f"Connected to PostgreSQL (attempt {attempt})")
            return conn
        except Exception as e:
            log.warning(f"Connection attempt {attempt}/{retries} failed: {e}")
            if attempt < retries:
                time.sleep(delay * attempt)
    log.error("All connection attempts failed. Exiting.")
    sys.exit(1)


def execute_with_retry(cursor, conn, query, data, description, retries=3):
    """Execute a batch insert with retry on transient errors."""
    for attempt in range(1, retries + 1):
        try:
            execute_values(cursor, query, data)
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            log.warning(f"{description} attempt {attempt}/{retries} failed: {e}")
            if attempt < retries:
                time.sleep(2 ** attempt)
    log.error(f"{description} failed after {retries} retries")
    return False


def validate_dataframe(df):
    """Validate MDDS column structure before import."""
    required_cols = ['MDDS STC', 'STATE NAME', 'MDDS DTC', 'DISTRICT NAME',
                     'MDDS Sub_DT', 'SUB-DISTRICT NAME', 'MDDS PLCN', 'Area Name']
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        log.error(f"Missing required columns: {missing}")
        log.error(f"Found columns: {list(df.columns)}")
        sys.exit(1)
    log.info(f"✓ All required columns present. Total rows: {len(df):,}")

    # Check for critical nulls
    for col in ['MDDS PLCN', 'Area Name']:
        null_count = df[col].isna().sum()
        if null_count:
            log.warning(f"  {null_count:,} rows with null '{col}' — will be skipped")


def import_mdds_data(file_path: str):
    log.info("=" * 60)
    log.info(f"MDDS Import started: {file_path}")
    log.info("=" * 60)

    # Read Excel
    log.info("Reading Excel file...")
    try:
        df = pd.read_excel(file_path, dtype=str)   # read all as str to avoid float codes
        df.columns = df.columns.str.strip()
    except Exception as e:
        log.error(f"Failed to read Excel: {e}")
        sys.exit(1)

    validate_dataframe(df)

    # Clean all string columns
    for col in df.columns:
        df[col] = df[col].str.strip()

    conn = get_connection()
    cursor = conn.cursor()

    try:
        # ── 1. Country ──────────────────────────────────────────────────────
        country_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO "Country" (id, code, name)
            VALUES (%s, %s, %s)
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
            RETURNING id;
        """, (country_id, 'IN', 'India'))
        country_id = cursor.fetchone()[0]
        conn.commit()
        log.info(f"✓ Country 'India' — id: {country_id}")

        # ── 2. States ───────────────────────────────────────────────────────
        states_df = df[['MDDS STC', 'STATE NAME']].drop_duplicates().dropna()
        states_data = [
            (str(uuid.uuid4()), str(r['MDDS STC']), str(r['STATE NAME']), country_id)
            for _, r in states_df.iterrows()
        ]
        execute_with_retry(cursor, conn, """
            INSERT INTO "State" (id, code, name, "countryId")
            VALUES %s
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        """, states_data, "States insert")
        cursor.execute('SELECT code, id FROM "State"')
        state_map = {r[0]: r[1] for r in cursor.fetchall()}
        SUMMARY['states'] = len(state_map)
        log.info(f"✓ States: {len(state_map):,}")

        # ── 3. Districts ────────────────────────────────────────────────────
        districts_df = df[['MDDS STC', 'MDDS DTC', 'DISTRICT NAME']].drop_duplicates().dropna()
        districts_data = []
        for _, r in districts_df.iterrows():
            st = state_map.get(str(r['MDDS STC']))
            if st:
                districts_data.append((str(uuid.uuid4()), str(r['MDDS DTC']), str(r['DISTRICT NAME']), st))
        execute_with_retry(cursor, conn, """
            INSERT INTO "District" (id, code, name, "stateId")
            VALUES %s
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        """, districts_data, "Districts insert")
        cursor.execute('SELECT code, id FROM "District"')
        district_map = {r[0]: r[1] for r in cursor.fetchall()}
        SUMMARY['districts'] = len(district_map)
        log.info(f"✓ Districts: {len(district_map):,}")

        # ── 4. Sub-Districts ────────────────────────────────────────────────
        subd_df = df[['MDDS DTC', 'MDDS Sub_DT', 'SUB-DISTRICT NAME']].drop_duplicates().dropna()
        subd_data = []
        for _, r in subd_df.iterrows():
            dt = district_map.get(str(r['MDDS DTC']))
            if dt:
                subd_data.append((str(uuid.uuid4()), str(r['MDDS Sub_DT']), str(r['SUB-DISTRICT NAME']), dt))
        execute_with_retry(cursor, conn, """
            INSERT INTO "SubDistrict" (id, code, name, "districtId")
            VALUES %s
            ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        """, subd_data, "SubDistricts insert")
        cursor.execute('SELECT code, id FROM "SubDistrict"')
        subd_map = {r[0]: r[1] for r in cursor.fetchall()}
        SUMMARY['sub_districts'] = len(subd_map)
        log.info(f"✓ Sub-Districts: {len(subd_map):,}")

        # ── 5. Villages (batch, with per-batch retry) ───────────────────────
        log.info("Importing villages (this may take several minutes)...")
        villages_df = df[['MDDS Sub_DT', 'MDDS PLCN', 'Area Name']].drop_duplicates(
            subset=['MDDS PLCN']
        ).dropna(subset=['MDDS PLCN', 'Area Name'])

        SUMMARY['villages_total'] = len(villages_df)

        BATCH_SIZE = 5000
        batches = [villages_df.iloc[i:i + BATCH_SIZE] for i in range(0, len(villages_df), BATCH_SIZE)]

        for batch_num, batch in enumerate(batches, 1):
            batch_data = []
            for _, r in batch.iterrows():
                sd = subd_map.get(str(r['MDDS Sub_DT']))
                if not sd:
                    SUMMARY['failed_rows'].append({
                        'MDDS PLCN': r['MDDS PLCN'],
                        'Area Name': r['Area Name'],
                        'MDDS Sub_DT': r['MDDS Sub_DT'],
                        'reason': 'SubDistrict not found in DB',
                    })
                    SUMMARY['villages_failed'] += 1
                    continue
                batch_data.append((str(uuid.uuid4()), str(r['MDDS PLCN']), str(r['Area Name']), sd))

            if batch_data:
                success = execute_with_retry(cursor, conn, """
                    INSERT INTO "Village" (id, code, name, "subDistrictId")
                    VALUES %s
                    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
                """, batch_data, f"Villages batch {batch_num}/{len(batches)}")
                if success:
                    SUMMARY['villages_inserted'] += len(batch_data)

            inserted_so_far = min(batch_num * BATCH_SIZE, len(villages_df))
            pct = (inserted_so_far / len(villages_df)) * 100
            log.info(f"  Progress: {inserted_so_far:,}/{len(villages_df):,} ({pct:.1f}%) — batch {batch_num}/{len(batches)}")

        conn.commit()

    except Exception as e:
        conn.rollback()
        log.error(f"Fatal error during import: {e}")
    finally:
        cursor.close()
        conn.close()

    # ── Write failed rows ────────────────────────────────────────────────────
    if SUMMARY['failed_rows']:
        with open(FAILED_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['MDDS PLCN', 'Area Name', 'MDDS Sub_DT', 'reason'])
            writer.writeheader()
            writer.writerows(SUMMARY['failed_rows'])
        log.warning(f"⚠  {len(SUMMARY['failed_rows']):,} failed rows written to {FAILED_CSV}")

    # ── Print summary ────────────────────────────────────────────────────────
    log.info("")
    log.info("=" * 60)
    log.info("IMPORT SUMMARY")
    log.info("=" * 60)
    log.info(f"  States:           {SUMMARY['states']:,}")
    log.info(f"  Districts:        {SUMMARY['districts']:,}")
    log.info(f"  Sub-Districts:    {SUMMARY['sub_districts']:,}")
    log.info(f"  Villages found:   {SUMMARY['villages_total']:,}")
    log.info(f"  Villages inserted:{SUMMARY['villages_inserted']:,}")
    log.info(f"  Villages failed:  {SUMMARY['villages_failed']:,}")
    log.info("=" * 60)
    log.info("Import complete ✓")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python import_data.py <path_to_mdds_excel_file.xlsx>")
        sys.exit(1)
    import_mdds_data(sys.argv[1])
