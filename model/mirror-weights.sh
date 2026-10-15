#!/usr/bin/env bash
#
# Mirrors the weights file from Hugging Face into the weights bucket that
# infra/platform creates, so that no build depends on Hugging Face. The file is
# checked against its SHA-256 before it is stored. Safe to run again: a file
# already in the bucket is left as it is.
#
#   model/mirror-weights.sh

set -euo pipefail

PROJECT="project-45649980-817a-462c-b12"
BUCKET="${PROJECT}-model-weights"

# The weights: the Q6_K quantisation of BSC-LT/salamandra-7b-instruct-2606.
# model/cloudbuild-weights.yaml names the same file and revision.
WEIGHTS_REPO="mradermacher/salamandra-7b-instruct-2606-GGUF"
WEIGHTS_REVISION="8bcd7d8d8545749ef73b3046f7cb5cd64d8c70c1"
WEIGHTS_FILE="salamandra-7b-instruct-2606.Q6_K.gguf"
WEIGHTS_SHA256="a32ca4975dc9e7b04fc2ba9aa8e78a1bcd394315b4424475ba63c75616534fd9"

WEIGHTS_OBJECT="gs://${BUCKET}/${WEIGHTS_REVISION}/${WEIGHTS_FILE}"

command -v gcloud >/dev/null || PATH="${HOME}/google-cloud-sdk/bin:${PATH}"

sha256() {
  if command -v sha256sum >/dev/null; then
    sha256sum "$1" | cut -d ' ' -f 1
  else
    shasum -a 256 "$1" | cut -d ' ' -f 1
  fi
}

if gcloud --project "${PROJECT}" storage objects describe "${WEIGHTS_OBJECT}" >/dev/null 2>&1; then
  echo "${WEIGHTS_OBJECT} is in the bucket already."
  exit 0
fi

download="$(mktemp -d)"
trap 'rm -rf "${download}"' EXIT

echo "Fetching ${WEIGHTS_FILE}, 6.38 GB, from Hugging Face"
curl --fail --location --retry 5 \
  --output "${download}/${WEIGHTS_FILE}" \
  "https://huggingface.co/${WEIGHTS_REPO}/resolve/${WEIGHTS_REVISION}/${WEIGHTS_FILE}"

echo "Checking its SHA-256"
actual="$(sha256 "${download}/${WEIGHTS_FILE}")"
if [ "${actual}" != "${WEIGHTS_SHA256}" ]; then
  echo "The weights file does not match its checksum, so it was not stored." >&2
  echo "  expected ${WEIGHTS_SHA256}" >&2
  echo "  actual   ${actual}" >&2
  exit 1
fi

echo "Storing it in the bucket"
gcloud --project "${PROJECT}" storage cp "${download}/${WEIGHTS_FILE}" "${WEIGHTS_OBJECT}" \
  --custom-metadata "sha256=${WEIGHTS_SHA256}"
