#!/usr/bin/env bash
#
# Deploys a service image as the model host on Cloud Run. Every setting of the
# service is here. It starts a GPU instance, which is billed while it runs.
#
#   model/deploy.sh IMAGE
#
# To build the image first, from the repository root:
#
#   gcloud builds submit model --config model/cloudbuild.yaml \
#     --project <project> --region europe-west4 \
#     --service-account projects/<project>/serviceAccounts/model-host-pipeline@<project>.iam.gserviceaccount.com \
#     --gcs-source-staging-dir gs://<project>-model-weights/source \
#     --substitutions _TAG=$(git rev-parse --short HEAD)

set -euo pipefail

PROJECT="project-45649980-817a-462c-b12"
REGION="europe-west4"

SERVICE="model-host"
SERVICE_EMAIL="model-host@${PROJECT}.iam.gserviceaccount.com"
SECRET="model-host-api-key"

if [ $# -ne 1 ]; then
  echo "Usage: model/deploy.sh IMAGE" >&2
  exit 1
fi
image="$1"

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
  --startup-probe "httpGet.path=/health,httpGet.port=8080,periodSeconds=1,timeoutSeconds=1,failureThreshold=240"
