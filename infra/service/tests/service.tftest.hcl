# Plans the service against a mocked provider: nothing reaches Google.
#
#   terraform -chdir=infra/service init -backend=false
#   terraform -chdir=infra/service test

mock_provider "google" {}

# What Cloud Run reports once the service is applied, for the output the
# pipeline reads.
override_resource {
  target          = google_cloud_run_v2_service.model_host
  override_during = plan
  values = {
    latest_created_revision = "projects/p/locations/europe-west4/revisions/model-host-00003-def"
    traffic_statuses = [
      { type = "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION", revision = "model-host-00002-abc", percent = 100, tag = "", uri = "" },
      { type = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST", revision = "", percent = 0, tag = "candidate", uri = "https://candidate---model-host-xyz.a.run.app" },
    ]
  }
}

# Salamandra's settings, as in salamandra.tfvars, which a test cannot read.
variables {
  service  = "model-host"
  gpu      = "nvidia-l4"
  cpu      = "4"
  memory   = "16Gi"
  secret   = "model-host-api-key"
  timeout  = "120s"
  image    = "europe-west4-docker.pkg.dev/p/model-host/service@sha256:abc"
  revision = "model-host-0b6c1a5e-8f2d-4c3b-9a71-2e5d4f6a8b90"
}

run "latest_takes_all_traffic_by_default" {
  command = plan

  assert {
    condition     = length(google_cloud_run_v2_service.model_host.traffic) == 1
    error_message = "Only the latest revision should be named."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.traffic[0].type == "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    error_message = "The traffic should go to the latest revision."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.traffic[0].percent == 100
    error_message = "The latest revision should take all traffic."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.traffic[0].tag == "candidate"
    error_message = "The latest revision should be reachable under the tag candidate."
  }
}

run "serving_revision_keeps_traffic_while_candidate_is_tried" {
  command = plan

  variables {
    serving_revision = "model-host-00002-abc"
  }

  assert {
    condition     = length(google_cloud_run_v2_service.model_host.traffic) == 2
    error_message = "Both the serving revision and the latest should be named."
  }
  assert {
    condition = contains(
      [for t in google_cloud_run_v2_service.model_host.traffic : [t.type, t.revision, t.percent]],
      ["TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION", "model-host-00002-abc", 100],
    )
    error_message = "The serving revision should keep all traffic."
  }
  assert {
    condition = contains(
      [for t in google_cloud_run_v2_service.model_host.traffic : [t.type, t.tag, t.percent]],
      ["TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST", "candidate", 0],
    )
    error_message = "The latest revision should take no traffic, under the tag candidate."
  }
  assert {
    condition     = output.candidate_url == "https://candidate---model-host-xyz.a.run.app"
    error_message = "The candidate should be reached through its tag's URL."
  }
}

run "service_settings" {
  command = plan

  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].containers[0].image == var.image
    error_message = "The service should run the image it is given."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].scaling[0].min_instance_count == 0 && google_cloud_run_v2_service.model_host.template[0].scaling[0].max_instance_count == 1
    error_message = "The service should scale between zero and one instance."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].health_check_disabled
    error_message = "A deploy should start no instance, so that the pipeline times a real cold start."
  }
  assert {
    condition     = google_cloud_run_v2_service_iam_member.anyone.member == "allUsers"
    error_message = "Anyone should be able to reach the service; the API key is the gate."
  }
}

# Each model's host is the same service but for these.
run "the_model_decides_its_service_settings" {
  command = plan

  variables {
    service  = "model-host-other"
    gpu      = "nvidia-rtx-pro-6000"
    cpu      = "20"
    memory   = "80Gi"
    secret   = "model-host-other-api-key"
    timeout  = "300s"
    revision = "model-host-other-1"
  }

  assert {
    condition     = google_cloud_run_v2_service.model_host.name == "model-host-other"
    error_message = "The service should take the model's name."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].node_selector[0].accelerator == "nvidia-rtx-pro-6000"
    error_message = "The service should run on the model's GPU."
  }
  assert {
    condition = google_cloud_run_v2_service.model_host.template[0].containers[0].resources[0].limits == tomap({
      cpu              = "20"
      memory           = "80Gi"
      "nvidia.com/gpu" = "1"
    })
    error_message = "The service should have the model's CPUs and memory, and one GPU."
  }
  assert {
    condition = one([
      for e in google_cloud_run_v2_service.model_host.template[0].containers[0].env :
      e.value_source[0].secret_key_ref[0].secret if e.name == "LLAMA_API_KEY"
    ]) == "model-host-other-api-key"
    error_message = "The server should read the model's key."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].timeout == "300s"
    error_message = "A request should be held as long as the model's cold start needs."
  }
  assert {
    condition     = google_cloud_run_v2_service_iam_member.anyone.name == "model-host-other"
    error_message = "Anyone should be able to reach the model's service."
  }
}

run "the_revision_is_named_by_whoever_applies" {
  command = plan

  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].revision == var.revision
    error_message = "The revision should take the name it is given, so that nothing has to read it back."
  }
  assert {
    condition     = output.revision == var.revision
    error_message = "The name should be an output, for an apply by hand that keeps the revision."
  }
}

run "a_revision_name_belongs_to_the_service" {
  command = plan

  variables {
    revision = "model-host-alia-1"
    service  = "model-host-other"
  }

  expect_failures = [var.revision]
}

run "image_is_required" {
  command = plan

  variables {
    image = ""
  }

  expect_failures = [var.image]
}
