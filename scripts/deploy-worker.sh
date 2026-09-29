#!/usr/bin/env bash
# Deploys the Content Studio worker to Cloud Run for one environment.
#
#   scripts/deploy-worker.sh staging             build, push, deploy
#   scripts/deploy-worker.sh staging --setup     first time: registry, secrets
#                                                from env/staging.env, IAM; then deploy
#   scripts/deploy-worker.sh staging --secrets   refresh secrets from the env file; then deploy
#
# Same for `production` (env/production.env, asks you to type "production").
# Secrets hold DATABASE_URL (with connection_limit=3), DIRECT_URL and
# OPENAI_API_KEY. STUDIO_MODEL_* and STUDIO_RUN_TOKEN_CEILING in the env file
# are passed as plain variables on every deploy.
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=worker-config.sh
source scripts/worker-config.sh
REPO=studio

ENVIRONMENT=${1:-}
MODE=${2:-}
if ! worker_config "$ENVIRONMENT"; then
  echo "Usage: $0 <staging|production> [--setup|--secrets]" >&2
  exit 1
fi
case "$MODE" in
  '' | --setup | --secrets) ;;
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

# Reads one key from the env file with the same parser the app uses.
env_value() {
  node -e '
    const { parseEnv } = require("node:util");
    const values = parseEnv(require("node:fs").readFileSync(process.argv[1], "utf8"));
    process.stdout.write(values[process.argv[2]] ?? "");
  ' "$ENV_FILE" "$1"
}

if [[ "$ENVIRONMENT" == production ]]; then
  confirm_production deploys
fi

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
RUNTIME_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
REGISTRY="$REGION-docker.pkg.dev/$PROJECT/$REPO"

# secret name -> env file key
SECRETS=(
  "$SECRET_PREFIX-database-url:DATABASE_URL"
  "$SECRET_PREFIX-direct-url:DIRECT_URL"
  "$SECRET_PREFIX-openai-api-key:OPENAI_API_KEY"
)

secret_value() {
  local value
  value=$(env_value "$1")
  if [[ -z "$value" ]]; then
    echo "$1 is empty in $ENV_FILE" >&2
    exit 1
  fi
  case "$1" in
    DATABASE_URL)
      # The worker's Prisma pool stays small next to the website's.
      if [[ "$value" != *connection_limit=* ]]; then
        [[ "$value" == *\?* ]] && value="$value&connection_limit=3" || value="$value?connection_limit=3"
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

push_secrets() {
  local entry name key
  for entry in "${SECRETS[@]}"; do
    name=${entry%%:*}
    key=${entry#*:}
    if gcloud secrets describe "$name" --project "$PROJECT" >/dev/null 2>&1; then
      secret_value "$key" | gcloud secrets versions add "$name" --data-file=- --project "$PROJECT" >/dev/null
      echo "Updated secret $name"
    else
      secret_value "$key" | gcloud secrets create "$name" --data-file=- --replication-policy=automatic --project "$PROJECT" >/dev/null
      echo "Created secret $name"
    fi
    gcloud secrets add-iam-policy-binding "$name" --project "$PROJECT" \
      --member="serviceAccount:$RUNTIME_SA" --role=roles/secretmanager.secretAccessor >/dev/null
  done
}

if [[ "$MODE" == --setup ]]; then
  if ! gcloud artifacts repositories describe "$REPO" --location "$REGION" --project "$PROJECT" >/dev/null 2>&1; then
    gcloud artifacts repositories create "$REPO" --repository-format=docker \
      --location "$REGION" --project "$PROJECT"
  fi
  gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet >/dev/null
fi
if [[ "$MODE" == --setup || "$MODE" == --secrets ]]; then
  push_secrets
fi

TAG=$(git rev-parse --short HEAD)
if [[ -n "$(git status --porcelain -- src worker prisma package.json yarn.lock tsconfig.json)" ]]; then
  echo "Note: building uncommitted changes in src/worker/prisma; tagging as dirty."
  TAG="$TAG-dirty-$(date +%Y%m%d%H%M%S)"
fi
IMAGE="$REGISTRY/worker:$TAG"

docker build --platform linux/amd64 -f worker/Dockerfile -t "$IMAGE" .
docker push "$IMAGE"

# Plain (non-secret) settings from the env file.
ENV_VARS=()
while IFS= read -r key; do
  value=$(env_value "$key")
  [[ -n "$value" ]] && ENV_VARS+=("$key=$value")
done < <(node -e '
  const { parseEnv } = require("node:util");
  const values = parseEnv(require("node:fs").readFileSync(process.argv[1], "utf8"));
  for (const k of Object.keys(values))
    if (/^STUDIO_MODEL_|^STUDIO_RUN_TOKEN_CEILING$/.test(k)) console.log(k);
' "$ENV_FILE")
if ((${#ENV_VARS[@]})); then
  ENV_FLAG=(--set-env-vars "^|^$(IFS='|'; echo "${ENV_VARS[*]}")")
else
  ENV_FLAG=(--clear-env-vars)
fi

gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --project "$PROJECT" \
  --min-instances 1 \
  --max-instances 1 \
  --no-cpu-throttling \
  --cpu "$CPU" \
  --memory "$MEMORY" \
  --concurrency 1 \
  --port 8080 \
  --no-allow-unauthenticated \
  --set-secrets "DATABASE_URL=$SECRET_PREFIX-database-url:latest,DIRECT_URL=$SECRET_PREFIX-direct-url:latest,OPENAI_API_KEY=$SECRET_PREFIX-openai-api-key:latest" \
  "${ENV_FLAG[@]}"

echo
echo "Deployed $IMAGE to $SERVICE. Logs:"
echo "  gcloud run services logs read $SERVICE --region $REGION --project $PROJECT --limit 50"
