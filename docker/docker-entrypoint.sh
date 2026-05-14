#!/bin/sh
set -e
if [ "${WAIT_FOR_DEPS:-1}" != "0" ]; then
  node /app/docker/wait-for.js
fi
(
  cd /app/backend && node src/server.js
) &
(
  cd /app/dashboard && ./node_modules/.bin/next start -H 0.0.0.0 -p "${DASHBOARD_PORT:-3001}"
) &
wait
