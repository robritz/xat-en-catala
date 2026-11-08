# A model host on Cloud Run. Every setting of the service is here, and what
# differs between models is in local.models, chosen by var.model. The deploy
# pipeline, infra/service/cloudbuild.yaml, applies it twice per deploy:
# once keeping traffic on the serving revision while the new one is tried, and
# once keeping it on the new one, named. Nothing in the second apply changes
# the revision's template, so it makes no new revision.

# What differs between the models' hosts. Each model's state is a workspace
# of its own: Salamandra's is the default one, which held the only model host
# before there were two. infra/platform's models name the same workspaces.
locals {
  models = {
    salamandra = {
      workspace = "default"
      service   = "model-host"
      # One NVIDIA L4, with 4 CPUs and 16 GiB.
      gpu    = "nvidia-l4"
      cpu    = "4"
      memory = "16Gi"
      # 120 seconds, against a cold start of 10 to 20.
      timeout = "120s"
      # Four minutes to load 6.4 GB of weights, which takes 10 to 20 seconds.
      startup_seconds = 240
    }
    alia = {
      workspace = "alia"
      service   = "model-host-alia"
      # One NVIDIA RTX PRO 6000, with that GPU's minimum of 20 CPUs and
      # 80 GiB: ALIA does not fit an L4. See docs/adr/0003.
      gpu    = "nvidia-rtx-pro-6000"
      cpu    = "20"
      memory = "80Gi"
      # 180 seconds. A cold start takes 18 to 31, and a deploy fails a
      # revision that takes more than 90.
      timeout = "180s"
      # Five minutes to load 43 GB of weights, which takes 13 to 25 seconds.
      startup_seconds = 300
    }
  }
  model = local.models[var.model]

  keep_serving = var.serving_revision != ""
}

resource "google_cloud_run_v2_service" "model_host" {
  name     = local.model.service
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  # A new image's revision is ready only once Cloud Run has imported the
  # image, which took ALIA's 43 GB about 11 minutes, near the provider's
  # default of 20.
  timeouts {
    create = "45m"
    update = "45m"
  }

  # An apply in another model's state would replace that model's service
  # with this one.
  lifecycle {
    precondition {
      condition     = terraform.workspace == local.model.workspace
      error_message = "${var.model}'s state is the workspace ${local.model.workspace}, not ${terraform.workspace}: run terraform workspace select ${local.model.workspace}."
    }
  }

  template {
    revision        = var.revision
    service_account = "model-host@${var.project}.iam.gserviceaccount.com"

    # One GPU, billed for as long as an instance is up, which a GPU requires.
    # Zero to one instance caps spend at one GPU and costs nothing when idle.
    node_selector {
      accelerator = local.model.gpu
    }
    gpu_zonal_redundancy_disabled = true
    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    # Four requests at once matches the four replies the server runs at once.
    max_instance_request_concurrency = 4

    # The app's chat route holds a request open through a cold start for as
    # long as the slower model's timeout, ALIA's. Change them together.
    timeout = local.model.timeout

    # A deploy starts no instance: the first request to a revision does, so
    # the pipeline can time a real cold start, and its message, not this
    # check, is what a revision has to pass before it takes traffic.
    health_check_disabled = true

    containers {
      image = var.image

      # The image's entrypoint is the server, which listens on 8080.
      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu              = local.model.cpu
          memory           = local.model.memory
          "nvidia.com/gpu" = "1"
        }
        cpu_idle = false
      }

      # The server reads its API key from here. The key comes from Secret
      # Manager and is named here, never held.
      env {
        name = "LLAMA_API_KEY"
        value_source {
          secret_key_ref {
            secret  = "${local.model.service}-api-key"
            version = "latest"
          }
        }
      }

      # Keeps requests from an instance until the weights are loaded: the
      # server's health route fails until then. It asks every second and
      # gives up after the model's startup_seconds.
      startup_probe {
        period_seconds    = 1
        timeout_seconds   = 1
        failure_threshold = local.model.startup_seconds
        http_get {
          path = "/health"
          port = 8080
        }
      }
    }
  }

  dynamic "traffic" {
    for_each = local.keep_serving ? [var.serving_revision] : []
    content {
      type     = "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION"
      revision = traffic.value
      percent  = 100
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = local.keep_serving ? 0 : 100
    tag     = "candidate"
  }
}

# Anyone can reach the service; the server's API key is the gate.
resource "google_cloud_run_v2_service_iam_member" "anyone" {
  name     = google_cloud_run_v2_service.model_host.name
  location = google_cloud_run_v2_service.model_host.location
  role     = "roles/run.invoker"
  member   = "allUsers"
}
