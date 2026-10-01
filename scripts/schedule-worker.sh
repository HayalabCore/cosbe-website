#!/usr/bin/env bash
# Starts and stops a deployed Content Studio worker on a schedule (Tokyo time),
# from Cloud Scheduler, so it runs without a laptop or a user login.
#
#   scripts/schedule-worker.sh staging            create or update the jobs
#   scripts/schedule-worker.sh staging --remove   delete them (worker stays as it is)
#
# Each job sets min instances on the service through the Cloud Run API, the
# same switch `yarn worker:up` / `worker:down` flip. It authenticates as the
# studio-worker-scheduler service account, which may only update the worker
# services, so Workspace login policies never interrupt it.
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=worker-config.sh
source scripts/worker-config.sh

UP_CRON='0 8 * * *'
DOWN_CRON='0 18 * * *'
TIME_ZONE=Asia/Tokyo

ENVIRONMENT=${1:-}
MODE=${2:-}
if ! worker_config "$ENVIRONMENT" || [[ -n "$MODE" && "$MODE" != --remove ]]; then
  echo "Usage: $0 <staging|production> [--remove]" >&2
  exit 1
fi
[[ "$ENVIRONMENT" == production ]] && confirm_production schedules

WHERE=(--location "$REGION" --project "$PROJECT")
SCHEDULER_SA="studio-worker-scheduler@$PROJECT.iam.gserviceaccount.com"

if [[ "$MODE" == --remove ]]; then
  for job in "$SERVICE-up" "$SERVICE-down"; do
    gcloud scheduler jobs delete "$job" "${WHERE[@]}" --quiet || true
  done
  exit 0
fi

gcloud services enable cloudscheduler.googleapis.com --project "$PROJECT"

if ! gcloud iam service-accounts describe "$SCHEDULER_SA" --project "$PROJECT" >/dev/null 2>&1; then
  gcloud iam service-accounts create studio-worker-scheduler --project "$PROJECT" \
    --display-name "Starts and stops the Content Studio workers"
fi
# May update this worker service, and deploy it as the runtime account it already uses.
gcloud run services add-iam-policy-binding "$SERVICE" --region "$REGION" --project "$PROJECT" \
  --member "serviceAccount:$SCHEDULER_SA" --role roles/run.developer >/dev/null
RUNTIME_SA=$(gcloud run services describe "$SERVICE" --region "$REGION" --project "$PROJECT" \
  --format 'value(spec.template.spec.serviceAccountName)')
gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" --project "$PROJECT" \
  --member "serviceAccount:$SCHEDULER_SA" --role roles/iam.serviceAccountUser >/dev/null

# Only template.scaling.minInstanceCount changes; image, secrets and resources stay.
# Cloud Scheduler cannot send PATCH, so it POSTs with Google's method override.
URI="https://run.googleapis.com/v2/projects/$PROJECT/locations/$REGION/services/$SERVICE?updateMask=template.scaling.minInstanceCount"

schedule_job() {
  local name=$1 cron=$2 min=$3 verb=create header_flag=--headers
  if gcloud scheduler jobs describe "$name" "${WHERE[@]}" >/dev/null 2>&1; then
    verb=update
    header_flag=--update-headers
  fi
  gcloud scheduler jobs "$verb" http "$name" "${WHERE[@]}" \
    --schedule "$cron" \
    --time-zone "$TIME_ZONE" \
    --uri "$URI" \
    --http-method POST \
    "$header_flag" Content-Type=application/json,X-HTTP-Method-Override=PATCH \
    --message-body "{\"template\":{\"scaling\":{\"minInstanceCount\":$min}}}" \
    --oauth-service-account-email "$SCHEDULER_SA" \
    --oauth-token-scope https://www.googleapis.com/auth/cloud-platform \
    --attempt-deadline 60s >/dev/null
  echo "$name: \"$cron\" $TIME_ZONE -> min instances $min"
}

schedule_job "$SERVICE-up" "$UP_CRON" 1
schedule_job "$SERVICE-down" "$DOWN_CRON" 0
echo "Run one now to test: gcloud scheduler jobs run $SERVICE-up --location $REGION --project $PROJECT"
