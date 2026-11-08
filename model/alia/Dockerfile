# ALIA's service image: llama.cpp's server with ALIA's weights beside it, as
# model/salamandra/Dockerfile is Salamandra's, with the same engine and flags.
#
# The weights come from ALIA's weights image, which
# model/alia/cloudbuild-weights.yaml builds, so that building this image never
# fetches them from anywhere else. That file names the weights file, as the CMD
# below does, and the weights image's tag, as WEIGHTS_TAG does.
#
# This file alone decides what the image holds, so the image is tagged with
# its checksum: see model/image-tag.sh.

ARG REGISTRY=europe-west4-docker.pkg.dev/project-45649980-817a-462c-b12/model-host
ARG WEIGHTS_TAG=Q8_0-257ea58cdc8ff825634b36d1d2bfe052d4ac20f9
FROM ${REGISTRY}/alia-weights:${WEIGHTS_TAG} AS weights

# The official server-cuda image, build b11561, as Salamandra's.
FROM ghcr.io/ggml-org/llama.cpp:server-cuda@sha256:20c6e722e2fcc5ca9c15401d3fd8e35408aaf8f9c54a12f32920f637c57959bb

# The weights sit in a layer of their own, before anything that changes often,
# so that a build which changes only the flags below can take the layer from
# the image before it. model/cloudbuild.yaml sees to that with a cache; built
# afresh, the layer gets a new digest and a deploy moves 43 GB. Loading it
# takes 13 to 25 seconds of a cold start.
COPY --from=weights /models /models

# The server runs as nobody, not as root, so that whoever takes control of it
# does not hold the container. It needs no more: the weights are readable by
# all, and port 8080 needs no privilege. The user is given by number so that
# the image does not depend on the base image's user list.
USER 65534:65534

# The image's entrypoint is the server, which already listens on port 8080 on
# all addresses. It reads the API key from LLAMA_API_KEY, which Cloud Run sets
# from Secret Manager, and uses the chat template embedded in the weights file
# because it is given no other. The alias is the name the app asks for ALIA
# under, in src/lib/model-host.ts.
CMD [ \
  "--model", "/models/ALIA-40b-instruct-2601-Q8_0.gguf", \
  "--alias", "BSC-LT/ALIA-40b-instruct-2601", \
  "--n-gpu-layers", "all", \
  # Four replies at once with 8,192 tokens of context each: the context is
  # shared out among the replies.
  "--parallel", "4", \
  "--ctx-size", "32768", \
  # The app sets temperature and top-p. These are the samplers it cannot set
  # that are on unless told otherwise; the rest are off already.
  "--top-k", "0", \
  "--min-p", "0", \
  "--no-webui", \
  "--no-slots" \
]
