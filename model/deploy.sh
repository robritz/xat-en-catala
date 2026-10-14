#!/usr/bin/env bash
#
# Deploys a service image as the model host on Cloud Run. Every setting of the
# service is here.
#
#   model/deploy.sh IMAGE
#
# deploys the image and sends all traffic to it. It starts a GPU instance,
# which is billed while it runs, and the deploy fails, leaving traffic where it
# was, if the instance does not pass its startup probe.
#
#   model/deploy.sh --candidate IMAGE
#
# is what model/cloudbuild.yaml runs on a merge. It deploys the image as a
# revision that takes no traffic, reachable under the tag "candidate", and
# starts no instance: the first request to the tag's URL does, so the pipeline
# can time a real cold start. The pipeline sends traffic to it afterwards.

set -euo pipefail

PROJECT="project-45649980-817a-462c-b12"
REGION="europe-west4"

SERVICE="model-host"
SERVICE_EMAIL="model-host@${PROJECT}.iam.gserviceaccount.com"
SECRET="model-host-api-key"

candidate=false
if [ "${1:-}" = "--candidate" ]; then
  candidate=true
  shift
fi
if [ $# -ne 1 ]; then
  echo "Usage: model/deploy.sh [--candidate] IMAGE" >&2
  exit 1
fi
image="$1"

if [ "${candidate}" = true ]; then
  candidate_flags=(--no-traffic --tag candidate --no-deploy-health-check)
else
  candidate_flags=()
fi

command -v gcloud >/dev/null || PATH="${HOME}/google-cloud-sdk/bin:${PATH}"

# One NVIDIA L4 with 4 CPUs and 16 GiB, billed for as long as an instance is
# up, which a GPU requires. Zero to one instance caps spend at one GPU and
# costs nothing when idle.
#
# Four requests at once matches the four replies the server runs at once.
#
# Anyone can reach the service; the server's API key is the gate. The key
# comes from Secret Manager and is named here, never held.
#
# The timeout matches the app's chat route, which holds a request open through
# a cold start. The startup probe keeps requests from an instance until the
# weights are loaded: the server's health route fails until then. It asks
# every second and gives up after four minutes.
gcloud run deploy "${SERVICE}" \
  --project "${PROJECT}" \
  --region "${REGION}" \
  --image "${image}" \
  --service-account "${SERVICE_EMAIL}" \
  --gpu 1 \
  --gpu-type nvidia-l4 \
  --no-gpu-zonal-redundancy \
  --cpu 4 \
  --memory 16Gi \
  --no-cpu-throttling \
  --min-instances 0 \
  --max-instances 1 \
  --concurrency 4 \
  --allow-unauthenticated \
  --timeout 300 \
  --port 8080 \
  --set-secrets "LLAMA_API_KEY=${SECRET}:latest" \
  --startup-probe "httpGet.path=/health,httpGet.port=8080,periodSeconds=1,timeoutSeconds=1,failureThreshold=240" \
  ${candidate_flags[@]+"${candidate_flags[@]}"}

# Once the pipeline has sent traffic to a revision by name, a new revision gets
# none until it is told to, so a deploy by hand says so.
if [ "${candidate}" = false ]; then
  gcloud run services update-traffic "${SERVICE}" \
    --project "${PROJECT}" \
    --region "${REGION}" \
    --to-latest
fi
