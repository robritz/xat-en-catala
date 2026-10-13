# The model host's service image: llama.cpp's server with the weights beside it.
#
# The weights come from the weights image, which model/cloudbuild-weights.yaml
# builds, so that building this image never fetches them from anywhere else.
# That file names the weights file, as the CMD below does.

ARG WEIGHTS_IMAGE
# hadolint ignore=DL3006
FROM ${WEIGHTS_IMAGE} AS weights

# The official server-cuda image, build b11561.
FROM ghcr.io/ggml-org/llama.cpp:server-cuda@sha256:20c6e722e2fcc5ca9c15401d3fd8e35408aaf8f9c54a12f32920f637c57959bb

# The weights sit in a layer of their own, before anything that changes often,
# so that a build which changes only the flags below can take the layer from
# the image before it. model/cloudbuild.yaml sees to that with a cache; built
# afresh, the layer gets a new digest and a deploy moves 6.4 GB.
COPY --from=weights /models /models

# The image's entrypoint is the server, which already listens on port 8080 on
# all addresses. It reads the API key from LLAMA_API_KEY, which Cloud Run sets
# from Secret Manager, and uses the chat template embedded in the weights file
# because it is given no other.
CMD [ \
  "--model", "/models/salamandra-7b-instruct-2606.Q6_K.gguf", \
  "--alias", "BSC-LT/salamandra-7b-instruct-2606", \
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
