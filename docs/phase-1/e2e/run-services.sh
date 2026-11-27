#!/usr/bin/env bash
# =====================================================================
# Chay 5 service MEMS o che do native.
# Mac dinh: schema mems_e2e_*, gateway 9080, identity 9081, people 9082,
#          schedule 9083, facility 9084.
# Doi che do bang bien moi truong:
#   SCHEMA_PREFIX=mems_ BASE_PORT=9180 ./run-services.sh
# KHONG dung docker. Doc secret tu .env luc chay.
# =====================================================================
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
OUT="$ROOT/docs/phase-1/e2e/results"
LOGS="$OUT/logs"
PIDS="$OUT/pids"
mkdir -p "$LOGS" "$PIDS"

SCHEMA_PREFIX="${SCHEMA_PREFIX:-mems_e2e_}"
BASE_PORT="${BASE_PORT:-9080}"
GW_PORT="$BASE_PORT"
ID_PORT=$((BASE_PORT + 1))
PEOPLE_PORT=$((BASE_PORT + 2))
SCHEDULE_PORT=$((BASE_PORT + 3))
FACILITY_PORT=$((BASE_PORT + 4))

die() { echo "ERROR: $*" >&2; exit 1; }
[ -f .env ] || die ".env not found"

getone() { grep -m1 "^$1=" .env | cut -d= -f2- | tr -d '\r' | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'; }
DB_USERNAME="$(getone DB_USERNAME)"
DB_PASSWORD="$(getone DB_PASSWORD)"
JWT_SECRET_BASE64="$(getone JWT_SECRET_BASE64)"
INTERNAL_API_KEY="$(getone INTERNAL_API_KEY)"
[ -n "$DB_USERNAME" ] && [ -n "$DB_PASSWORD" ] && [ -n "$JWT_SECRET_BASE64" ] && [ -n "$INTERNAL_API_KEY" ] \
  || die "missing DB/JWT/internal key in .env"

JDBC_BASE="jdbc:mysql://127.0.0.1:3306/%s?useSSL=false&allowPublicKeyRetrieval=true&characterEncoding=utf8&serverTimezone=Asia/Ho_Chi_Minh"
jdbc() { printf "$JDBC_BASE" "$1"; }

port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") >/dev/null 2>&1 && { exec 3>&-; exec 3<&-; return 0; } || return 1; }

# Refuse to start if our ports are already occupied
for p in "$GW_PORT" "$ID_PORT" "$PEOPLE_PORT" "$SCHEDULE_PORT" "$FACILITY_PORT"; do
  if port_open "$p"; then die "port $p already in use"; fi
done

wait_http() { # port, name, path
  local port="$1" name="$2" path="$3" i code
  for i in $(seq 1 90); do
    code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}${path}" 2>/dev/null || true)"
    if [ -n "$code" ] && [ "$code" != "000" ]; then echo "  ready $name ($code)"; return 0; fi
    sleep 2
  done
  tail -40 "$LOGS/$name.log" >&2 || true
  die "$name did not become ready on :$port"
}

start_service() { # name, jar, port, jvm-extra-args, extra env pairs (NAME=VAL ...)
  local name="$1" jar="$2" port="$3" jvm="$4"; shift 4
  local pidf="$PIDS/$name.pid"
  [ -f "$jar" ] || die "jar missing: $jar"
  echo "starting $name on :$port"
  # Eureka that that (register-with-eureka=true trong application.properties se tro vao
  # Eureka that dang chay o 8761). Tat ca 2 chieu de khong dung vao registry that.
  env "$@" \
    java $jvm -Duser.timezone=Asia/Ho_Chi_Minh -jar "$jar" --server.port="$port" \
    --eureka.client.register-with-eureka=false --eureka.client.fetch-registry=false \
    >"$LOGS/$name.log" 2>&1 &
  echo $! > "$pidf"
  sleep 1
  kill -0 "$(cat "$pidf")" 2>/dev/null || { tail -40 "$LOGS/$name.log" >&2; die "$name exited early"; }
}

COMMON=(DB_USERNAME="$DB_USERNAME" DB_PASSWORD="$DB_PASSWORD" JWT_SECRET_BASE64="$JWT_SECRET_BASE64" INTERNAL_API_KEY="$INTERNAL_API_KEY" EUREKA_CLIENT_ENABLED=false)

# 1) Identity
start_service identity "$ROOT/backend/IdentityService/target/IdentityService-0.0.1-SNAPSHOT.jar" "$ID_PORT" "" \
  "${COMMON[@]}" DB_URL="$(jdbc "${SCHEMA_PREFIX}identity_db")" \
  PEOPLE_SERVICE_URL="http://127.0.0.1:${PEOPLE_PORT}" \
  OWNER_BOOTSTRAP_ENABLED=false SUPER_ADMIN_BOOTSTRAP_ENABLED=false
wait_http "$ID_PORT" identity "/api/v1/auth/login"

# 2) People
start_service people "$ROOT/backend/PeopleService/target/PeopleService-0.0.1-SNAPSHOT.jar" "$PEOPLE_PORT" "" \
  "${COMMON[@]}" DB_URL="$(jdbc "${SCHEMA_PREFIX}people_db")" \
  IDENTITY_SERVICE_URL="http://127.0.0.1:${ID_PORT}" PEOPLE_SERVICE_URL="http://127.0.0.1:${PEOPLE_PORT}" \
  TEACHER_ASSIGNMENT_MODULE_CODE=TEACHER_ASSIGNMENT
wait_http "$PEOPLE_PORT" people "/internal/classes/x?orgId=x"

# 3) Facility
start_service facility "$ROOT/backend/FacilityService/target/FacilityService-0.0.1-SNAPSHOT.jar" "$FACILITY_PORT" "" \
  "${COMMON[@]}" DB_URL="$(jdbc "${SCHEMA_PREFIX}facility_db")" \
  IDENTITY_SERVICE_URL="http://127.0.0.1:${ID_PORT}"
wait_http "$FACILITY_PORT" facility "/internal/rooms?orgId=x"

# 4) Schedule
start_service schedule "$ROOT/backend/ScheduleService/target/ScheduleService-0.0.1-SNAPSHOT.jar" "$SCHEDULE_PORT" "" \
  "${COMMON[@]}" DB_URL="$(jdbc "${SCHEMA_PREFIX}schedule_db")" \
  IDENTITY_SERVICE_URL="http://127.0.0.1:${ID_PORT}" PEOPLE_SERVICE_URL="http://127.0.0.1:${PEOPLE_PORT}" \
  FACILITY_SERVICE_URL="http://127.0.0.1:${FACILITY_PORT}" \
  SCHEDULE_APPROVAL_ENABLED=false SCHEDULE_OUTSIDE_BOOKING_ENABLED=false
wait_http "$SCHEDULE_PORT" schedule "/schedules/me"

# 5) Gateway
start_service gateway "$ROOT/backend/APIGateway/target/APIGateway-0.0.1-SNAPSHOT.jar" "$GW_PORT" "" \
  IDENTITY_SERVICE_URL="http://127.0.0.1:${ID_PORT}" PEOPLE_SERVICE_URL="http://127.0.0.1:${PEOPLE_PORT}" \
  SCHEDULE_SERVICE_URL="http://127.0.0.1:${SCHEDULE_PORT}" FACILITY_SERVICE_URL="http://127.0.0.1:${FACILITY_PORT}" \
  EUREKA_CLIENT_ENABLED=false
wait_http "$GW_PORT" gateway "/api/v1/auth/login"

echo "All services are up (gateway :$GW_PORT, schemas ${SCHEMA_PREFIX}*)."
