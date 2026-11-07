# Salamandra's model host. infra/service/cloudbuild.yaml applies with this
# file when infra/platform's triggers name the model salamandra.

service = "model-host"

# One NVIDIA L4, with 4 CPUs and 16 GiB.
gpu    = "nvidia-l4"
cpu    = "4"
memory = "16Gi"

secret = "model-host-api-key"

# 120 seconds, against a cold start of 10 to 20.
timeout = "120s"
