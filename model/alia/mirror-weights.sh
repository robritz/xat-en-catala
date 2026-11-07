#!/usr/bin/env bash
#
# Mirrors ALIA's weights file from Hugging Face into the weights bucket that
# infra/platform creates, so that no build depends on Hugging Face. Safe to run
# again: a file already in the bucket is left as it is.
#
#   model/alia/mirror-weights.sh
#
# The file is 43 GB, so unlike Salamandra's it is not downloaded first: it is
# streamed into the bucket under a staging name while its SHA-256 is worked out
# on the way, and moved to its own name only if that matches. A file that does
# not match is deleted.

set -euo pipefail

PROJECT="project-45649980-817a-462c-b12"
BUCKET="${PROJECT}-model-weights"

# The weights: BSC's own Q8_0 conversion of BSC-LT/ALIA-40b-instruct-2601.
# model/alia/cloudbuild-weights.yaml names the same file and revision.
WEIGHTS_REPO="BSC-LT/ALIA-40b-instruct-2601-GGUF"
WEIGHTS_REVISION="257ea58cdc8ff825634b36d1d2bfe052d4ac20f9"
WEIGHTS_FILE="ALIA-40b-instruct-2601-Q8_0.gguf"
WEIGHTS_SHA256="fa2d8b15c9df7aaee96e31ddb8dece553bb6b826253bc067f98c9ccb61c9851f"

WEIGHTS_OBJECT="gs://${BUCKET}/${WEIGHTS_REVISION}/${WEIGHTS_FILE}"
STAGING_OBJECT="${WEIGHTS_OBJECT}.staging"

command -v gcloud >/dev/null || PATH="${HOME}/google-cloud-sdk/bin:${PATH}"

sha256() {
  if command -v sha256sum >/dev/null; then
    sha256sum | cut -d ' ' -f 1
  else
    shasum -a 256 | cut -d ' ' -f 1
  fi
}

if gcloud --project "${PROJECT}" storage objects describe "${WEIGHTS_OBJECT}" >/dev/null 2>&1; then
  echo "${WEIGHTS_OBJECT} is in the bucket already."
  exit 0
fi

work="$(mktemp -d)"
trap 'rm -rf "${work}"' EXIT

# The stream is copied into a pipe that the checksum reads from, so the file
# is read once and never stored here.
mkfifo "${work}/stream"
sha256 < "${work}/stream" > "${work}/sha256" &
checksum=$!

echo "Streaming ${WEIGHTS_FILE}, 42.97 GB, from Hugging Face into the bucket"
curl --fail --location --silent --show-error \
  "https://huggingface.co/${WEIGHTS_REPO}/resolve/${WEIGHTS_REVISION}/${WEIGHTS_FILE}" |
  tee "${work}/stream" |
  gcloud --project "${PROJECT}" storage cp - "${STAGING_OBJECT}"
wait "${checksum}"

echo "Checking its SHA-256"
actual="$(cat "${work}/sha256")"
if [ "${actual}" != "${WEIGHTS_SHA256}" ]; then
  gcloud --project "${PROJECT}" storage rm "${STAGING_OBJECT}"
  echo "The weights file does not match its checksum, so it was not stored." >&2
  echo "  expected ${WEIGHTS_SHA256}" >&2
  echo "  actual   ${actual}" >&2
  exit 1
fi

echo "Moving it to its own name"
gcloud --project "${PROJECT}" storage mv "${STAGING_OBJECT}" "${WEIGHTS_OBJECT}"
gcloud --project "${PROJECT}" storage objects update "${WEIGHTS_OBJECT}" \
  --custom-metadata "sha256=${WEIGHTS_SHA256}"
