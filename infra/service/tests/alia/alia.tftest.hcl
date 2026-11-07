# Plans ALIA's service against a mocked provider: nothing reaches Google.
#
# The service refuses to plan a model outside its own workspace, and a test
# plans in the workspace Terraform is in, so these run in ALIA's, apart from
# tests/service.tftest.hcl, which runs in Salamandra's:
#
#   terraform -chdir=infra/service init -backend=false
#   TF_WORKSPACE=alia terraform -chdir=infra/service test -test-directory=tests/alia

mock_provider "google" {}

variables {
  model    = "alia"
  image    = "europe-west4-docker.pkg.dev/p/model-host/alia@sha256:abc"
  revision = "model-host-alia-0b6c1a5e-8f2d-4c3b-9a71-2e5d4f6a8b90"
}

run "alia_runs_on_an_rtx_pro_6000" {
  command = plan

  assert {
    condition     = google_cloud_run_v2_service.model_host.name == "model-host-alia"
    error_message = "ALIA's service should be model-host-alia."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].node_selector[0].accelerator == "nvidia-rtx-pro-6000"
    error_message = "ALIA should run on an RTX PRO 6000."
  }
  assert {
    condition = google_cloud_run_v2_service.model_host.template[0].containers[0].resources[0].limits == tomap({
      cpu              = "20"
      memory           = "80Gi"
      "nvidia.com/gpu" = "1"
    })
    error_message = "ALIA should have 20 CPUs, 80 GiB and one GPU."
  }
  assert {
    condition = one([
      for e in google_cloud_run_v2_service.model_host.template[0].containers[0].env :
      e.value_source[0].secret_key_ref[0].secret if e.name == "LLAMA_API_KEY"
    ]) == "model-host-alia-api-key"
    error_message = "ALIA's server should read its own key."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].timeout == "900s"
    error_message = "A request to ALIA should be held for 900 seconds."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].containers[0].startup_probe[0].failure_threshold == 900
    error_message = "ALIA's instance should have fifteen minutes to load its weights."
  }
}

run "alia_scales_as_salamandra_does" {
  command = plan

  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].scaling[0].min_instance_count == 0 && google_cloud_run_v2_service.model_host.template[0].scaling[0].max_instance_count == 1
    error_message = "ALIA's service should scale between zero and one instance."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].max_instance_request_concurrency == 4
    error_message = "ALIA's service should take four requests at once."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].gpu_zonal_redundancy_disabled
    error_message = "ALIA's GPU should be without zonal redundancy."
  }
  assert {
    condition     = google_cloud_run_v2_service.model_host.template[0].containers[0].startup_probe[0].http_get[0].path == "/health"
    error_message = "ALIA's startup probe should ask the server's health route."
  }
}

run "a_salamandra_revision_is_refused" {
  command = plan

  variables {
    revision = "model-host-1"
  }

  expect_failures = [var.revision]
}

run "salamandra_is_refused_in_the_alia_workspace" {
  command = plan

  variables {
    model    = "salamandra"
    revision = "model-host-1"
  }

  expect_failures = [google_cloud_run_v2_service.model_host]
}
