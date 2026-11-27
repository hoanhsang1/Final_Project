#!/usr/bin/env bash
# =====================================================================
# Nap BO DU LIEU MAU (org "E2E Xep lich") vao các schema THAT mems_*
# tren MySQL local. Chi THEM dong moi, id co dinh tien to eeeeeeee-.
#
# CANH BAO:
#   - Day la DB local ma backend/tunnel co the dang tro toi.
#   - Chi chay sau khi da chay du migration 43-59. Script tu kiem tra
#     va dung lai neu thieu cot/bang.
#   - Khong xoa/sua du lieu that; khong dung module/role catalog hien co.
#
# Chay: ./docs/phase-1/e2e/seed-local-test-org.sh --i-approve
# =====================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

[ "${1:-}" = "--i-approve" ] || {
  echo "Script nay GHI vao schema mems_* (du lieu that tren may local)." >&2
  echo "Doc docs/phase-1/e2e/TEST-DATA.md, sau do chay lai voi --i-approve." >&2
  exit 1
}

die() { echo "ERROR: $*" >&2; exit 1; }
[ -f .env ] || die ".env not found"

getone() { grep -m1 "^$1=" .env | cut -d= -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
DB_USERNAME="$(getone DB_USERNAME)"
DB_PASSWORD="$(getone DB_PASSWORD)"
[ -n "$DB_USERNAME" ] && [ -n "$DB_PASSWORD" ] || die "missing DB_USERNAME/DB_PASSWORD in .env"

export MYSQL_PWD="$DB_PASSWORD"
MYSQL=(mysql -h127.0.0.1 -P3306 -u"$DB_USERNAME" --default-character-set=utf8mb4)

has_col() { "${MYSQL[@]}" -N -B -e "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='$1' AND table_name='$2' AND column_name='$3'"; }
has_tbl() { "${MYSQL[@]}" -N -B -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$1' AND table_name='$2'"; }

missing=()
check_col() { [ "$(has_col "$1" "$2" "$3")" -gt 0 ] || missing+=("cột $1.$2.$3"); }
check_tbl() { [ "$(has_tbl "$1" "$2")" -gt 0 ] || missing+=("bảng $1.$2"); }

check_col mems_people_db position system_code
check_col mems_people_db class_subject org_id
check_col mems_people_db class_subject sessions_per_week
check_col mems_people_db class_subject stage_no
check_col mems_people_db specialty category_id
check_col mems_people_db teacher_subject approved_by
check_col mems_people_db curriculum name_unaccented
check_col mems_schedule_db session subject_id

check_tbl mems_people_db class_subject_history
check_tbl mems_people_db specialty_subject
check_tbl mems_identity_db organization
check_tbl mems_schedule_db time_slot
check_tbl mems_schedule_db schedule_draft
check_tbl mems_schedule_db inbox_event
check_tbl mems_schedule_db consumer_aggregate_state
check_tbl mems_schedule_db session_impact
check_tbl mems_facility_db outbox_event

if [ "${#missing[@]}" -gt 0 ]; then
  echo "Schema mems_* chua duoc nang cap, thieu:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  echo >&2
  echo "Hay chay migration 43-59 (hoac ban nang cap tuong duong) truoc," >&2
  echo "hoac dung cach A voi schema mems_e2e_*: docs/phase-1/e2e/TEST-DATA.md" >&2
  exit 1
fi

src_count="$("${MYSQL[@]}" -N -B -e "SELECT COUNT(*) FROM mems_identity_db.account WHERE username='sample_owner'")"
[ "$src_count" -gt 0 ] || die "khong thay account 'sample_owner' de lay password_hash mau"

TMP_SQL="$(mktemp)"
trap 'rm -f "$TMP_SQL"' EXIT

# Doi schema e2e -> that; vo hieu hoa upsert module/role de khong sua catalog live.
sed -e 's/mems_e2e_/mems_/g' \
    -e 's/ON DUPLICATE KEY UPDATE name=VALUES(name), is_active=VALUES(is_active), is_core=VALUES(is_core);/ON DUPLICATE KEY UPDATE code=code;/' \
    -e 's/ON DUPLICATE KEY UPDATE name=VALUES(name), scope=VALUES(scope);/ON DUPLICATE KEY UPDATE code=code;/' \
    docs/phase-1/e2e/seed-e2e.sql > "$TMP_SQL"

"${MYSQL[@]}" < "$TMP_SQL"

echo
echo "== Tom tat =="
"${MYSQL[@]}" -t -e "
SELECT 'organization' AS bang, COUNT(*) AS so_dong FROM mems_identity_db.organization WHERE id LIKE 'eeeeeeee-%'
UNION ALL SELECT 'account', COUNT(*) FROM mems_identity_db.account WHERE username LIKE 'e2e_%'
UNION ALL SELECT 'school_class', COUNT(*) FROM mems_people_db.school_class WHERE id LIKE 'eeeeeeee-%'
UNION ALL SELECT 'class_subject', COUNT(*) FROM mems_people_db.class_subject WHERE id LIKE 'eeeeeeee-%'
UNION ALL SELECT 'classroom', COUNT(*) FROM mems_facility_db.classroom WHERE id LIKE 'eeeeeeee-%'
UNION ALL SELECT 'time_slot', COUNT(*) FROM mems_schedule_db.time_slot WHERE id LIKE 'eeeeeeee-%'
UNION ALL SELECT 'session', COUNT(*) FROM mems_schedule_db.session WHERE id LIKE 'eeeeeeee-%'"
echo "Xong. Tai khoan: e2e_owner / e2e_teacher1..4 / e2e_student / e2e_owner2 — mat khau Sample@123456"
