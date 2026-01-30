#!/usr/bin/env bash
set -euo pipefail

# Start the full local Supabase stack (Docker services).
supabase start >/dev/null

# Capture env-style status output and keep only KEY=VALUE lines.
STATUS_ENV="$(
  supabase status -o env 2>/dev/null \
  | grep -E '^[A-Z0-9_]+=' || true
)"

# Extract a value from STATUS_ENV and strip surrounding quotes.
get_env() {
  local key="$1"
  echo "$STATUS_ENV" \
    | grep -E "^${key}=" \
    | head -n1 \
    | cut -d= -f2- \
    | sed -E 's/^"//; s/"$//'
}

HOST_API_URL="$(get_env API_URL)"
ANON_KEY="$(get_env ANON_KEY)"
SERVICE_ROLE_KEY="$(get_env SERVICE_ROLE_KEY)"

if [[ -z "${HOST_API_URL}" || -z "${SERVICE_ROLE_KEY}" ]]; then
  echo "ERROR: Missing API_URL or SERVICE_ROLE_KEY from 'supabase status -o env'."
  echo "Run 'supabase status' and ensure the full stack is up (not just db)."
  exit 1
fi

# Write ONLY non-reserved secrets here. SUPABASE_* names are reserved and will be skipped.
mkdir -p supabase
cat > supabase/.env.edge <<EOF
SERVER_SALT=edge-test-salt-local
EOF

# Start Edge Functions server in the background.
supabase functions serve --env-file supabase/.env.edge --no-verify-jwt &
SERVE_PID=$!
trap 'kill "$SERVE_PID" 2>/dev/null || true' EXIT

# Wait for the functions gateway on the host.
FUNCTIONS_URL="${HOST_API_URL}/functions/v1"
for i in {1..30}; do
  if curl -fsS "${FUNCTIONS_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# Run tests on the host machine (Deno test runner also needs SERVER_SALT).
SERVER_SALT="edge-test-salt-local" \
SUPABASE_URL="${HOST_API_URL}" \
SUPABASE_SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY}" \
SUPABASE_FUNCTIONS_URL="${FUNCTIONS_URL}" \
deno test --trace-leaks supabase/functions/tests/edge-functions.test.ts \
  --allow-env --allow-net --allow-read
