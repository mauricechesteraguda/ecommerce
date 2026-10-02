#!/bin/sh
# infra-10022026-Maurice: exec preserves signals and does not print environment.
set -eu
printf '%s\n' '{"event":"container.start","service":"backend","level":"info"}'
exec "$@"
