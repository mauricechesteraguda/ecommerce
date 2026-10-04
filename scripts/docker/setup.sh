#!/usr/bin/env bash
# infra-10022026-Maurice: dependency-aware one-shot bootstrap; secret values are never echoed.
set -Eeuo nounset
RUN_ID="setup-$(date -u +%Y%m%dT%H%M%SZ)-$$"
PHASE=start
FINALIZED=0
log() { printf '{"event":"%s","service":"setup","level":"%s","run_id":"%s","phase":"%s"%s}\n' "$1" "${2:-info}" "$RUN_ID" "$PHASE" "${3:-}"; }
# modification-10042026-Maurice: emit a bounded structured failure before cleanup.
on_error() { local code=$?; FINALIZED=1; log setup.failure error ",\"exit_code\":$code" >&2; trap - ERR; exit "$code"; }
trap on_error ERR
trap 'code=$?; if [ "$code" -eq 0 ] && [ "$FINALIZED" -eq 0 ]; then log setup.success; else [ "$FINALIZED" -eq 1 ] || log setup.failure error ",\"exit_code\":$code" >&2; fi; exit "$code"' EXIT
log setup.start
# modification-10042026-Maurice: direct execution keeps dependency failures nonzero.
wait_for() {
  name=$1; host=$2; port=$3; i=0
  while ! node -e "const net=require('net'); const s=net.createConnection($port,'$host'); s.on('connect',()=>{s.end();process.exit(0)}); s.on('error',()=>process.exit(1))" 2>/dev/null; do
    i=$((i + 1)); [ "$i" -lt 60 ] || { log dependency.timeout error ",\"dependency\":\"$name\",\"exit_code\":1" >&2; exit 1; }
    sleep 2
  done
}
PHASE=dependencies
wait_for postgres postgres 5432
wait_for redis redis 6379
PHASE=migrations
log migrations.start
pnpm db:migrate
PHASE=catalog
log catalog.seed.start
pnpm seed:catalog
PHASE=admin.bootstrap
if [ "${ADMIN_BOOTSTRAP_ENABLED:-1}" = "1" ] && [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  output="$(mktemp)"
  log admin.bootstrap.start
  if pnpm admin:bootstrap -- --idempotent >"$output" 2>&1; then
    log admin.bootstrap.success
  elif grep -Eiq '^IDEMPOTENT_EXISTING_ADMIN=1$' "$output"; then
    log admin.bootstrap.already_exists
  else
    log admin.bootstrap.failure error ",\"stage\":\"admin.bootstrap\",\"code\":\"dependency_or_provider_failure\",\"exit_code\":1" >&2
    rm -f "$output"
    exit 1
  fi
  rm -f "$output"
fi
PHASE=complete
