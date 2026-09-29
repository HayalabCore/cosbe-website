#!/usr/bin/env bash
# Operates a deployed Content Studio worker (Cloud Run).
#
#   scripts/worker-ctl.sh <status|logs|tail|up|down|restart> <staging|production> [lines]
#
# down sets min instances to 0: with no traffic Cloud Run removes the instance
# within ~15 minutes; runs wait in the queue until up. restart rolls out a
# new revision of the same image; active jobs resume from their last step.
# Changing production asks you to type "production".
set -euo pipefail

cd "$(dirname "$0")/.."
# shellcheck source=worker-config.sh
source scripts/worker-config.sh

ACTION=${1:-}
ENVIRONMENT=${2:-}
usage() {
  echo "Usage: $0 <status|logs|tail|up|down|restart> <staging|production> [lines]" >&2
  exit 1
}
worker_config "$ENVIRONMENT" || usage
WHERE=(--region "$REGION" --project "$PROJECT")

status() {
  gcloud run services describe "$SERVICE" "${WHERE[@]}" --format="table[box](
    status.latestReadyRevisionName:label=REVISION,
    spec.template.metadata.annotations.'autoscaling.knative.dev/minScale':label=MIN_INSTANCES,
    spec.template.spec.containers[0].image.basename():label=IMAGE,
    status.conditions[0].status:label=READY)"
  echo "MIN_INSTANCES 1 = running, 0 = stopped (instance removed within ~15 min of stopping)."
}

case "$ACTION" in
  status)
    status
    ;;
  logs)
    gcloud run services logs read "$SERVICE" "${WHERE[@]}" --limit "${3:-100}"
    ;;
  tail)
    gcloud beta run services logs tail "$SERVICE" "${WHERE[@]}"
    ;;
  up)
    [[ "$ENVIRONMENT" == production ]] && confirm_production starts
    gcloud run services update "$SERVICE" "${WHERE[@]}" --min-instances 1
    status
    ;;
  down)
    [[ "$ENVIRONMENT" == production ]] && confirm_production stops
    gcloud run services update "$SERVICE" "${WHERE[@]}" --min-instances 0
    status
    ;;
  restart)
    [[ "$ENVIRONMENT" == production ]] && confirm_production restarts
    gcloud run services update "$SERVICE" "${WHERE[@]}" --update-env-vars "RESTARTED_AT=$(date +%s)"
    status
    ;;
  *)
    usage
    ;;
esac
