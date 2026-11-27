#!/usr/bin/env bash
# =====================================================================
# Tao 4 schema mems_e2e_* tu CAU TRUC schema live, bu cac cot/bang con
# thieu cua migration 43-59, roi nap du lieu mau.
# KHONG doc/ghi du lieu that: chi doc cau truc (mysqldump --no-data).
#
# Chay:   ./docs/phase-1/e2e/setup-e2e-db.sh            (giu schema dang co)
#         ./docs/phase-1/e2e/setup-e2e-db.sh --reset    (xoa & tao lai 4 schema e2e)
# =====================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

RESET=0
if [ "${1:-}" = "--reset" ]; then RESET=1; fi

die() { echo "ERROR: $*" >&2; exit 1; }
[ -f .env ] || die ".env not found"

getone() { grep -m1 "^$1=" .env | cut -d= -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
DB_USERNAME="$(getone DB_USERNAME)"
DB_PASSWORD="$(getone DB_PASSWORD)"
[ -n "$DB_USERNAME" ] && [ -n "$DB_PASSWORD" ] || die "missing DB_USERNAME/DB_PASSWORD in .env"

# MYSQL_PWD tranh dua mat khau len command line
export MYSQL_PWD="$DB_PASSWORD"
MYSQL=(mysql -h127.0.0.1 -P3306 -u"$DB_USERNAME" --default-character-set=utf8mb4)
DUMP=(mysqldump -h127.0.0.1 -P3306 -u"$DB_USERNAME" --default-character-set=utf8mb4 \
  --no-data --routines=false --triggers=false --events=false --skip-comments \
  --skip-add-drop-table --no-tablespaces --single-transaction --set-gtid-purged=OFF)

SOURCES=(mems_identity_db mems_people_db mems_schedule_db mems_facility_db)

table_count() { "${MYSQL[@]}" -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$1'"; }

for src in "${SOURCES[@]}"; do
  dst="mems_e2e_${src#mems_}"
  if [ "$(table_count "$src")" -eq 0 ]; then
    die "source schema '$src' khong ton tai hoac rong — can DB live local co du 4 schema"
  fi

  if [ "$RESET" -eq 1 ]; then
    echo "reset $dst"
    "${MYSQL[@]}" -e "DROP DATABASE IF EXISTS \`$dst\`"
  fi

  "${MYSQL[@]}" -e "CREATE DATABASE IF NOT EXISTS \`$dst\` CHARACTER SET utf8mb4"

  existing="$(table_count "$dst")"
  if [ "$existing" -gt 0 ]; then
    echo "skip clone $dst ($existing bang da co)"
  else
    echo "clone cau truc $src -> $dst"
    "${DUMP[@]}" "$src" \
      | sed "s/\`${src}\`/\`${dst}\`/g" \
      | "${MYSQL[@]}" "$dst"
  fi
done

echo "ap e2e-schema-patch.sql"
"${MYSQL[@]}" < docs/phase-1/e2e/e2e-schema-patch.sql

# Chi tren schema e2e: xoa nhap/buoi do cac lan test truoc sinh ra, dua ve baseline.
echo "don du lieu test cu (chi mems_e2e_schedule_db)"
"${MYSQL[@]}" -e "
DELETE FROM mems_e2e_schedule_db.schedule_draft_unscheduled;
DELETE FROM mems_e2e_schedule_db.schedule_draft_item;
DELETE FROM mems_e2e_schedule_db.schedule_draft;
DELETE FROM mems_e2e_schedule_db.session_impact;
DELETE FROM mems_e2e_schedule_db.session
 WHERE id NOT LIKE 'eeeeeeee-1234-4abc-9def-0000000000%';
DELETE FROM mems_e2e_schedule_db.class
 WHERE id NOT IN ('eeeeeeee-bbbb-4bbb-8bbb-000000000004',
                  'eeeeeeee-bbbb-4bbb-8bbb-000000000010');"

echo "nap seed-e2e.sql"
"${MYSQL[@]}" < docs/phase-1/e2e/seed-e2e.sql

echo
echo "== Tom tat =="
"${MYSQL[@]}" -t -e "
SELECT 'organization' AS bang, COUNT(*) AS so_dong FROM mems_e2e_identity_db.organization
UNION ALL SELECT 'account', COUNT(*) FROM mems_e2e_identity_db.account
UNION ALL SELECT 'school_class', COUNT(*) FROM mems_e2e_people_db.school_class
UNION ALL SELECT 'class_subject', COUNT(*) FROM mems_e2e_people_db.class_subject
UNION ALL SELECT 'classroom', COUNT(*) FROM mems_e2e_facility_db.classroom
UNION ALL SELECT 'time_slot', COUNT(*) FROM mems_e2e_schedule_db.time_slot
UNION ALL SELECT 'session', COUNT(*) FROM mems_e2e_schedule_db.session"
echo "Xong. Tiep theo: ./docs/phase-1/e2e/run-services.sh"
