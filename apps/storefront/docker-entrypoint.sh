#!/bin/sh
# infra-10022026-Maurice: exec preserves SIGTERM for graceful shutdown.
set -eu
printf '%s\n' '{"event":"container.start","service":"storefront","level":"info"}'
exec "$@"
