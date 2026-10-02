#!/bin/sh
# infra-10022026-Maurice: dependency-aware one-shot bootstrap; secret values are never echoed.
set -eu
log() { printf '{"event":"%s","service":"setup","level":"info"}\n' "$1"; }
wait_for() {
  name=$1; host=$2; port=$3; i=0
  while ! node -e "const net=require('net'); const s=net.createConnection($port,'$host'); s.on('connect',()=>{s.end();process.exit(0)}); s.on('error',()=>process.exit(1))" 2>/dev/null; do
    i=$((i + 1)); [ "$i" -lt 60 ] || { printf '{"event":"dependency.timeout","dependency":"%s","level":"error"}\n' "$name" >&2; exit 1; }
    sleep 2
  done
}
wait_for postgres postgres 5432
wait_for redis redis 6379
log migrations.start
pnpm db:migrate
log catalog.seed.start
pnpm seed:catalog
if [ "${ADMIN_BOOTSTRAP_ENABLED:-1}" = "1" ] && [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  if pnpm admin:bootstrap >/dev/null 2>&1; then log admin.bootstrap.created; else log admin.bootstrap.existing; fi
fi
log setup.complete
