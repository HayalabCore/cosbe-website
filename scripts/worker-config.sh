# Sourced by deploy-worker.sh and worker-ctl.sh: where each environment's
# Content Studio worker runs. Call `worker_config <staging|production>`.

PROJECT=cosbe-website-ed97c
# Same region as the App Hosting backends.
REGION=asia-east1

worker_config() {
  case "$1" in
    staging)
      SERVICE=studio-worker-staging
      SECRET_PREFIX=studio-staging
      # Cloud Run needs a whole CPU when it is always allocated.
      CPU=1
      MEMORY=1Gi
      ;;
    production)
      SERVICE=studio-worker
      SECRET_PREFIX=studio
      CPU=1
      MEMORY=2Gi
      ;;
    *)
      return 1
      ;;
  esac
}

# Makes you type "production" before anything changes the production worker.
confirm_production() {
  local answer
  read -r -p "This $1 the PRODUCTION worker ($SERVICE). Type \"production\" to continue: " answer
  [[ "$answer" == production ]] || {
    echo "Cancelled." >&2
    exit 1
  }
}
