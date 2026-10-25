#!/usr/bin/env bash
# Pushes the website's secrets from env/<env>.env to Google Secret Manager and
# lets the App Hosting backend read them. apphosting.<env>.yaml references them.
#
#   scripts/push-secrets.sh staging --dry-run   show what would change
#   scripts/push-secrets.sh staging             create/update secrets, grant access
#   scripts/push-secrets.sh production          same; asks you to type "production"
#
# A secret gets a new version only when its value differs from the latest one.
# Values are never printed. Public NEXT_PUBLIC_* values are not secrets: they
# live in apphosting.<env>.yaml.
set -euo pipefail

cd "$(dirname "$0")/.."

PROJECT=cosbe-website-ed97c
REGION=asia-east1

ENVIRONMENT=${1:-}
MODE=${2:-}
case "$ENVIRONMENT" in
  staging)
    BACKEND=cosbe-website-staging
    SECRET_PREFIX=web-staging
    ;;
  production)
    BACKEND=cosbe-website
    SECRET_PREFIX=web
    ;;
  *)
    echo "Usage: $0 <staging|production> [--dry-run]" >&2
    exit 1
    ;;
esac
case "$MODE" in
  '' | --dry-run) ;;
  *)
    echo "Unknown option: $MODE" >&2
    exit 1
    ;;
esac

ENV_FILE="env/$ENVIRONMENT.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

# secret name -> env file key
SECRETS=(
  "$SECRET_PREFIX-database-url:DATABASE_URL"
  "$SECRET_PREFIX-direct-url:DIRECT_URL"
  "$SECRET_PREFIX-supabase-service-role-key:SUPABASE_SERVICE_ROLE_KEY"
  "$SECRET_PREFIX-openai-api-key:OPENAI_API_KEY"
  "$SECRET_PREFIX-api-secret-key:API_SECRET_KEY"
)

# Reads one key from the env file with the same parser the app uses.
env_value() {
  node -e '
    const { parseEnv } = require("node:util");
    const values = parseEnv(require("node:fs").readFileSync(process.argv[1], "utf8"));
    process.stdout.write(values[process.argv[2]] ?? "");
  ' "$ENV_FILE" "$1"
}

secret_value() {
  local value
  value=$(env_value "$1")
  if [[ -z "$value" ]]; then
    echo "$1 is empty in $ENV_FILE" >&2
    exit 1
  fi
  case "$1" in
    DATABASE_URL)
      # Prisma's pool must go through the transaction pooler.
      if [[ "$value" != *:6543/* ]]; then
        echo "DATABASE_URL must be the transaction pooler (:6543)." >&2
        exit 1
      fi
      ;;
    DIRECT_URL)
      if [[ "$value" != *:5432/* ]]; then
        echo "DIRECT_URL must be the session pooler (:5432); pg-boss needs it." >&2
        exit 1
      fi
      ;;
  esac
  printf '%s' "$value"
}

sha() { shasum -a 256 | cut -d' ' -f1; }

if [[ "$ENVIRONMENT" == production && "$MODE" != --dry-run ]]; then
  read -r -p "This changes PRODUCTION secrets ($BACKEND). Type \"production\" to continue: " answer
  [[ "$answer" == production ]] || {
    echo "Cancelled." >&2
    exit 1
  }
fi

echo "[$ENVIRONMENT] $ENV_FILE -> Secret Manager ($PROJECT), backend $BACKEND"
for entry in "${SECRETS[@]}"; do
  name=${entry%%:*}
  key=${entry#*:}
  wanted=$(secret_value "$key" | sha)

  if gcloud secrets describe "$name" --project "$PROJECT" >/dev/null 2>&1; then
    current=$(gcloud secrets versions access latest --secret "$name" --project "$PROJECT" 2>/dev/null | sha || true)
    if [[ "$current" == "$wanted" ]]; then
      state=unchanged
    else
      state=update
    fi
  else
    state=create
  fi

  printf '  %-45s %s\n' "$name" "$state"
  [[ "$MODE" == --dry-run ]] && continue

  case "$state" in
    create)
      secret_value "$key" | gcloud secrets create "$name" --data-file=- \
        --replication-policy=automatic --project "$PROJECT" >/dev/null
      ;;
    update)
      secret_value "$key" | gcloud secrets versions add "$name" --data-file=- \
        --project "$PROJECT" >/dev/null
      ;;
  esac
  # Runtime and build service accounts of the backend.
  if ! output=$(firebase apphosting:secrets:grantaccess "$name" --backend "$BACKEND" \
    --location "$REGION" --project "$PROJECT" 2>&1); then
    echo "$output" >&2
    echo "Could not grant $BACKEND access to $name. Fix the error above (an expired login needs" >&2
    echo "'firebase login --reauth') and run this script again; it is safe to repeat." >&2
    exit 1
  fi
done

[[ "$MODE" == --dry-run ]] && echo "Dry run: nothing changed." || echo "Done."
