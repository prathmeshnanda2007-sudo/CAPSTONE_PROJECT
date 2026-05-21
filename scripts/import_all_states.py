"""
Multi-file MDDS importer.
Reads all per-state XLS/ODS files from a directory and imports them into NeonDB.

Usage:
  python import_all_states.py scripts/mdds_extracted/dataset/
"""

import os
import sys
import uuid
import time
import csv
import glob
import logging
from datetime import datetime
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# ─── Setup ────────────────────────────────────────────────────────────────────
load_dotenv(dotenv_path=Path(__file__).parent.parent / 'api' / '.env')
DB_URL = os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(f'import_all_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
    ]
)
log = logging.getLogger(__name__)

REQUIRED_COLS = ['MDDS STC', 'STATE NAME', 'MDDS DTC', 'DISTRICT NAME',
                 'MDDS Sub_DT', 'SUB-DISTRICT NAME', 'MDDS PLCN', 'Area Name']

FAILED_CSV = f'failed_rows_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'

SUMMARY = {
    'files_processed': 0, 'files_skipped': 0,
    'states': 0, 'districts': 0, 'sub_districts': 0,
    'villages_inserted': 0, 'villages_failed': 0,
    'failed_rows': []
}

# ─── DB helpers ───────────────────────────────────────────────────────────────
def get_connection():
    if not DB_URL or 'file:' in DB_URL or 'user:password' in DB_URL:
        log.error("Set DIRECT_URL in api/.env to a real NeonDB URL"); sys.exit(1)
    for attempt in range(1, 6):
        try:
            return psycopg2.connect(DB_URL)
        except Exception as e:
            log.warning(f"Connection attempt {attempt}/5 failed: {e}")
            time.sleep(2 * attempt)
    log.error("All DB connection attempts failed"); sys.exit(1)


def batch_upsert(cursor, conn, query, data, label, retries=3):
    for attempt in range(1, retries + 1):
        try:
            execute_values(cursor, query, data, page_size=2000)
            conn.commit()
            return True
        except Exception as e:
            conn.rollback()
            log.warning(f"{label} attempt {attempt}/{retries}: {e}")
            time.sleep(2 ** attempt)
    log.error(f"{label} failed after {retries} retries")
    return False


# ─── Read file (handles .xls, .xlsx, .ods) ───────────────────────────────────
def read_state_file(filepath: str) -> pd.DataFrame | None:
    ext = Path(filepath).suffix.lower()
    try:
        if ext == '.xls':
            df = pd.read_excel(filepath, dtype=str, engine='xlrd')
        elif ext == '.xlsx':
            df = pd.read_excel(filepath, dtype=str, engine='openpyxl')
        elif ext == '.ods':
            df = pd.read_excel(filepath, dtype=str, engine='odf')
        else:
            log.warning(f"Unsupported format: {filepath}"); return None
        df.columns = df.columns.str.strip()
        missing = [c for c in REQUIRED_COLS if c not in df.columns]
        if missing:
            log.warning(f"Missing columns {missing} in {Path(filepath).name}"); return None
        for col in df.select_dtypes(include='object').columns:
            df[col] = df[col].str.strip()
        return df
    except Exception as e:
        log.error(f"Failed to read {Path(filepath).name}: {e}"); return None


# ─── Main import ─────────────────────────────────────────────────────────────
def import_all(dataset_dir: str):
    files = sorted([
        f for f in glob.glob(os.path.join(dataset_dir, '*.xls'))
                    + glob.glob(os.path.join(dataset_dir, '*.xlsx'))
                    + glob.glob(os.path.join(dataset_dir, '*.ods'))
        if not Path(f).name.startswith('._')
    ])
    if not files:
        log.error(f"No XLS/XLSX/ODS files found in: {dataset_dir}"); sys.exit(1)

    log.info("=" * 65)
    log.info(f"MDDS Multi-State Import — {len(files)} files found")
    log.info("=" * 65)

    conn = get_connection()
    cur  = conn.cursor()

    # ── Country ──────────────────────────────────────────────────────────────
    cur.execute("""
        INSERT INTO "Country" (id, code, name) VALUES (%s, 'IN', 'India')
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id
    """, (str(uuid.uuid4()),))
    country_id = cur.fetchone()[0]
    conn.commit()
    log.info(f"✓ Country: India (id={country_id[:8]}...)")

    # ── Build lookup maps from DB (handles reruns / partial imports) ─────────
    cur.execute('SELECT code, id FROM "State"')
    state_map = {r[0]: r[1] for r in cur.fetchall()}
    cur.execute('SELECT code, id FROM "District"')
    district_map = {r[0]: r[1] for r in cur.fetchall()}
    cur.execute('SELECT code, id FROM "SubDistrict"')
    subd_map = {r[0]: r[1] for r in cur.fetchall()}

    try:
        for file_idx, filepath in enumerate(files, 1):
            fname = Path(filepath).name
            log.info(f"\n[{file_idx}/{len(files)}] Processing: {fname}")

            df = read_state_file(filepath)
            if df is None:
                SUMMARY['files_skipped'] += 1
                continue

            # Filter out header/summary rows (codes with all zeros)
            df = df[df['MDDS PLCN'].notna() & (df['MDDS PLCN'] != '000000')]
            df = df[df['Area Name'].notna() & (df['Area Name'] != '')]
            log.info(f"  Rows after filter: {len(df):,}")

            # ── States ───────────────────────────────────────────────────────
            new_states = [
                (str(uuid.uuid4()), str(r['MDDS STC']), str(r['STATE NAME']).title(), country_id)
                for _, r in df[['MDDS STC', 'STATE NAME']].drop_duplicates().dropna().iterrows()
                if str(r['MDDS STC']) not in state_map
            ]
            if new_states:
                batch_upsert(cur, conn, """
                    INSERT INTO "State" (id, code, name, "countryId") VALUES %s
                    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
                """, new_states, "States")
                cur.execute('SELECT code, id FROM "State"')
                state_map = {r[0]: r[1] for r in cur.fetchall()}
            log.info(f"  States in DB: {len(state_map)}")

            # ── Districts ────────────────────────────────────────────────────
            new_districts = []
            for _, r in df[['MDDS STC', 'MDDS DTC', 'DISTRICT NAME']].drop_duplicates().dropna().iterrows():
                code = str(r['MDDS DTC'])
                if code not in district_map:
                    sid = state_map.get(str(r['MDDS STC']))
                    if sid:
                        new_districts.append((str(uuid.uuid4()), code, str(r['DISTRICT NAME']).title(), sid))
            if new_districts:
                batch_upsert(cur, conn, """
                    INSERT INTO "District" (id, code, name, "stateId") VALUES %s
                    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
                """, new_districts, "Districts")
                cur.execute('SELECT code, id FROM "District"')
                district_map = {r[0]: r[1] for r in cur.fetchall()}
            log.info(f"  Districts in DB: {len(district_map)}")

            # ── Sub-Districts ────────────────────────────────────────────────
            new_subds = []
            seen_subd_codes = set()
            for _, r in df[['MDDS DTC', 'MDDS Sub_DT', 'SUB-DISTRICT NAME']].drop_duplicates().dropna().iterrows():
                code = str(r['MDDS Sub_DT'])
                if code not in subd_map and code not in seen_subd_codes:
                    did = district_map.get(str(r['MDDS DTC']))
                    if did:
                        new_subds.append((str(uuid.uuid4()), code, str(r['SUB-DISTRICT NAME']).title(), did))
                        seen_subd_codes.add(code)
            if new_subds:
                batch_upsert(cur, conn, """
                    INSERT INTO "SubDistrict" (id, code, name, "districtId") VALUES %s
                    ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
                """, new_subds, "SubDistricts")
                cur.execute('SELECT code, id FROM "SubDistrict"')
                subd_map = {r[0]: r[1] for r in cur.fetchall()}
            log.info(f"  SubDistricts in DB: {len(subd_map)}")

            # ── Villages (batched) ───────────────────────────────────────────
            villages_df = df[['MDDS Sub_DT', 'MDDS PLCN', 'Area Name']].drop_duplicates(subset=['MDDS PLCN']).dropna(subset=['MDDS PLCN', 'Area Name'])
            total_v = len(villages_df)
            batch_size = 5000
            inserted_v = 0

            for i in range(0, total_v, batch_size):
                batch = villages_df.iloc[i:i + batch_size]
                batch_data = []
                for _, r in batch.iterrows():
                    sid = subd_map.get(str(r['MDDS Sub_DT']))
                    if not sid:
                        SUMMARY['failed_rows'].append({
                            'file': fname, 'MDDS PLCN': r['MDDS PLCN'],
                            'Area Name': r['Area Name'], 'reason': 'SubDistrict not found'
                        })
                        SUMMARY['villages_failed'] += 1
                        continue
                    batch_data.append((str(uuid.uuid4()), str(r['MDDS PLCN']), str(r['Area Name']).strip(), sid))

                if batch_data:
                    ok = batch_upsert(cur, conn, """
                        INSERT INTO "Village" (id, code, name, "subDistrictId") VALUES %s
                        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
                    """, batch_data, f"Villages batch {i//batch_size+1}")
                    if ok:
                        inserted_v += len(batch_data)
                        SUMMARY['villages_inserted'] += len(batch_data)

            log.info(f"  ✓ Villages inserted: {inserted_v:,}/{total_v:,}")
            SUMMARY['files_processed'] += 1

    except KeyboardInterrupt:
        log.warning("Import interrupted by user")
        conn.rollback()
    except Exception as e:
        log.error(f"Fatal error: {e}")
        conn.rollback()
    finally:
        SUMMARY['states'] = len(state_map)
        SUMMARY['districts'] = len(district_map)
        SUMMARY['sub_districts'] = len(subd_map)
        cur.close()
        conn.close()

    # ── Write failed rows ────────────────────────────────────────────────────
    if SUMMARY['failed_rows']:
        with open(FAILED_CSV, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['file', 'MDDS PLCN', 'Area Name', 'reason'])
            writer.writeheader(); writer.writerows(SUMMARY['failed_rows'])
        log.warning(f"⚠  {len(SUMMARY['failed_rows']):,} failed rows → {FAILED_CSV}")

    # ── Final summary ────────────────────────────────────────────────────────
    log.info("\n" + "=" * 65)
    log.info("IMPORT COMPLETE — SUMMARY")
    log.info("=" * 65)
    log.info(f"  Files processed:      {SUMMARY['files_processed']} / {len(files)}")
    log.info(f"  Files skipped:        {SUMMARY['files_skipped']}")
    log.info(f"  States in DB:         {SUMMARY['states']:,}")
    log.info(f"  Districts in DB:      {SUMMARY['districts']:,}")
    log.info(f"  Sub-Districts in DB:  {SUMMARY['sub_districts']:,}")
    log.info(f"  Villages inserted:    {SUMMARY['villages_inserted']:,}")
    log.info(f"  Villages failed:      {SUMMARY['villages_failed']:,}")
    log.info("=" * 65)


if __name__ == "__main__":
    folder = sys.argv[1] if len(sys.argv) > 1 else 'scripts/mdds_extracted/dataset'
    import_all(folder)
