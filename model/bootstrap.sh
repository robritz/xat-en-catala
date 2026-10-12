#!/usr/bin/env bash
#
# Creates the cloud resources the Cloud Run model host is assembled from, and
# mirrors the weights file into the project. Safe to run again: anything that
# already exists is left as it is.
#
# It creates billable resources, and it does not create build triggers.

set -euo pipefail

PROJECT="project-45649980-817a-462c-b12"
REGION="europe-west4"

REPOSITORY="model-host"
BUCKET="${PROJECT}-model-weights"
SERVICE_ACCOUNT="model-host"
PIPELINE_ACCOUNT="model-host-pipeline"
SECRET="model-host-api-key"

# The weights: the Q6_K quantisation of BSC-LT/salamandra-7b-instruct-2606.
# model/cloudbuild-weights.yaml names the same file and revision.
WEIGHTS_REPO="mradermacher/salamandra-7b-instruct-2606-GGUF"
WEIGHTS_REVISION="8bcd7d8d8545749ef73b3046f7cb5cd64d8c70c1"
WEIGHTS_FILE="salamandra-7b-instruct-2606.Q6_K.gguf"
WEIGHTS_SHA256="a32ca4975dc9e7b04fc2ba9aa8e78a1bcd394315b4424475ba63c75616534fd9"

SERVICE_EMAIL="${SERVICE_ACCOUNT}@${PROJECT}.iam.gserviceaccount.com"
PIPELINE_EMAIL="${PIPELINE_ACCOUNT}@${PROJECT}.iam.gserviceaccount.com"
WEIGHTS_OBJECT="gs://${BUCKET}/${WEIGHTS_REVISION}/${WEIGHTS_FILE}"

command -v gcloud >/dev/null || PATH="${HOME}/google-cloud-sdk/bin:${PATH}"

in_project() {
  gcloud --project "${PROJECT}" --quiet "$@"
}

exists() {
  in_project "$@" >/dev/null 2>&1
}

# A service account can take a few seconds to be visible to IAM after it is
# created, so a binding that names one is tried more than once.
grant() {
  local attempt
  for attempt in 1 2 3 4 5; do
    if in_project "$@" >/dev/null; then
      return 0
    fi
    sleep $((attempt * 3))
  done
  echo "Could not grant: gcloud $*" >&2
  return 1
}

sha256() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$1" | cut -d ' ' -f 1
  else
    shasum -a 256 "$1" | cut -d ' ' -f 1
  fi
}

echo "APIs"
in_project services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  logging.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com

echo "Artifact Registry repository ${REPOSITORY}"
if ! exists artifacts repositories describe "${REPOSITORY}" --location "${REGION}"; then
  in_project artifacts repositories create "${REPOSITORY}" \
    --location "${REGION}" \
    --repository-format docker \
    --description "Images of the model host"
fi

echo "Bucket ${BUCKET}"
if ! exists storage buckets describe "gs://${BUCKET}"; then
  in_project storage buckets create "gs://${BUCKET}" \
    --location "${REGION}" \
    --uniform-bucket-level-access \
    --public-access-prevention
fi

echo "Service accounts"
if ! exists iam service-accounts describe "${SERVICE_EMAIL}"; then
  in_project iam service-accounts create "${SERVICE_ACCOUNT}" \
    --display-name "Model host service"
fi
if ! exists iam service-accounts describe "${PIPELINE_EMAIL}"; then
  in_project iam service-accounts create "${PIPELINE_ACCOUNT}" \
    --display-name "Model host pipeline"
fi

echo "Secret ${SECRET}"
if ! exists secrets describe "${SECRET}"; then
  in_project secrets create "${SECRET}" \
    --replication-policy user-managed \
    --locations "${REGION}"
fi
# The key goes from the generator to Secret Manager through a pipe, so it is
# never held in a variable, written to a file or shown. It has no trailing
# newline, which llama.cpp would otherwise take as part of the key.
versions="$(in_project secrets versions list "${SECRET}" --filter "state=ENABLED" --limit 1 --format "value(name)")"
if [ -z "${versions}" ]; then
  openssl rand -hex 32 | tr -d '\n' |
    in_project secrets versions add "${SECRET}" --data-file - >/dev/null
fi

echo "Roles"
# The service reads the key, and nothing else.
grant secrets add-iam-policy-binding "${SECRET}" \
  --member "serviceAccount:${SERVICE_EMAIL}" \
  --role roles/secretmanager.secretAccessor
# The pipeline pushes images to this repository,
grant artifacts repositories add-iam-policy-binding "${REPOSITORY}" \
  --location "${REGION}" \
  --member "serviceAccount:${PIPELINE_EMAIL}" \
  --role roles/artifactregistry.writer
# deploys the service, which includes opening it to unauthenticated requests,
grant projects add-iam-policy-binding "${PROJECT}" \
  --member "serviceAccount:${PIPELINE_EMAIL}" \
  --role roles/run.admin \
  --condition None
# as the service's account and no other,
grant iam service-accounts add-iam-policy-binding "${SERVICE_EMAIL}" \
  --member "serviceAccount:${PIPELINE_EMAIL}" \
  --role roles/iam.serviceAccountUser
# writes its build logs,
grant projects add-iam-policy-binding "${PROJECT}" \
  --member "serviceAccount:${PIPELINE_EMAIL}" \
  --role roles/logging.logWriter \
  --condition None
# and reads the weights file to build the weights image.
grant storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member "serviceAccount:${PIPELINE_EMAIL}" \
  --role roles/storage.objectViewer

echo "Weights ${WEIGHTS_FILE}"
if ! exists storage objects describe "${WEIGHTS_OBJECT}"; then
  download="$(mktemp -d)"
  trap 'rm -rf "${download}"' EXIT

  echo "  fetching 6.38 GB from Hugging Face"
  curl --fail --location --retry 5 \
    --output "${download}/${WEIGHTS_FILE}" \
    "https://huggingface.co/${WEIGHTS_REPO}/resolve/${WEIGHTS_REVISION}/${WEIGHTS_FILE}"

  echo "  checking its SHA-256"
  actual="$(sha256 "${download}/${WEIGHTS_FILE}")"
  if [ "${actual}" != "${WEIGHTS_SHA256}" ]; then
    echo "The weights file does not match its checksum, so it was not stored." >&2
    echo "  expected ${WEIGHTS_SHA256}" >&2
    echo "  actual   ${actual}" >&2
    exit 1
  fi

  echo "  storing it in the bucket"
  in_project storage cp "${download}/${WEIGHTS_FILE}" "${WEIGHTS_OBJECT}" \
    --custom-metadata "sha256=${WEIGHTS_SHA256}"
fi

cat <<EOF

Done. To build the weights image, which is needed once and again only when the
weights change:

  gcloud builds submit --no-source \\
    --project ${PROJECT} --region ${REGION} \\
    --config model/cloudbuild-weights.yaml \\
    --service-account projects/${PROJECT}/serviceAccounts/${PIPELINE_EMAIL}
EOF
