#!/usr/bin/env bash
#
# Prints the tag of the service image that model/Dockerfile describes: the
# first twelve characters of the Dockerfile's SHA-256.
#
# The build pipeline pushes the image under this tag, and the deploy pipeline,
# which runs on the same merge but apart from it, waits for an image under the
# same tag. A merge that leaves the Dockerfile alone keeps the tag, so the
# build finds the image already pushed and builds nothing.

set -euo pipefail

dockerfile="$(dirname "$0")/Dockerfile"

if command -v sha256sum >/dev/null; then
  sha256sum "${dockerfile}" | cut -c 1-12
else
  shasum -a 256 "${dockerfile}" | cut -c 1-12
fi
