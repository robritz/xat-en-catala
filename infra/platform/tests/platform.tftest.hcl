# Plans the platform against a mocked provider: nothing reaches Google.
#
#   terraform -chdir=infra/platform init -backend=false
#   terraform -chdir=infra/platform test

mock_provider "google" {
  # Made-up values are known when planning, as the adopted resources need.
  override_during = plan

  # Values that pass the provider's checks, where made-up ones would not.
  mock_resource "google_service_account" {
    defaults = {
      name   = "projects/p/serviceAccounts/a@p.iam.gserviceaccount.com"
      id     = "projects/p/serviceAccounts/a@p.iam.gserviceaccount.com"
      email  = "a@p.iam.gserviceaccount.com"
      member = "serviceAccount:a@p.iam.gserviceaccount.com"
    }
  }
}

# A mocked provider cannot import, so the resources imports.tf adopts are
# overridden instead.
override_resource {
  target = google_artifact_registry_repository.model_host
}
override_resource {
  target = google_storage_bucket.weights
}
override_resource {
  target = google_storage_bucket.state
}
override_resource {
  target = google_service_account.service
  values = {
    name   = "projects/p/serviceAccounts/model-host@p.iam.gserviceaccount.com"
    id     = "projects/p/serviceAccounts/model-host@p.iam.gserviceaccount.com"
    email  = "model-host@p.iam.gserviceaccount.com"
    member = "serviceAccount:model-host@p.iam.gserviceaccount.com"
  }
}
override_resource {
  target = google_secret_manager_secret.api_key
}
override_resource {
  target = google_developer_connect_connection.github
}
override_resource {
  target = google_developer_connect_git_repository_link.repository
}
override_resource {
  target = google_cloudbuild_trigger.deploy
}

run "build_and_deploy_are_separate_pipelines" {
  command = plan

  assert {
    condition     = google_cloudbuild_trigger.build.filename == "model/cloudbuild.yaml"
    error_message = "The build trigger should run the build pipeline."
  }
  assert {
    condition     = google_cloudbuild_trigger.deploy.filename == "infra/service/cloudbuild.yaml"
    error_message = "The deploy trigger should run the deploy pipeline."
  }
  assert {
    condition     = google_cloudbuild_trigger.build.included_files == tolist(["model/**"])
    error_message = "A merge should build only when model/ changes."
  }
  assert {
    condition     = toset(google_cloudbuild_trigger.deploy.included_files) == toset(["model/Dockerfile", "infra/service/**"])
    error_message = "A merge should deploy only when the image or the service changes."
  }
  assert {
    condition = alltrue([
      for t in [google_cloudbuild_trigger.build, google_cloudbuild_trigger.deploy] :
      t.developer_connect_event_config[0].push[0].branch == "^main$"
    ])
    error_message = "Both pipelines should run on a merge to main."
  }
}

run "each_pipeline_has_only_its_own_powers" {
  command = plan

  assert {
    condition     = google_service_account.build.account_id == "model-host-build" && google_service_account.deploy.account_id == "model-host-deploy"
    error_message = "Each pipeline should have its own service account."
  }
  assert {
    condition     = google_artifact_registry_repository_iam_member.build_pushes.role == "roles/artifactregistry.writer"
    error_message = "The build pipeline should push images."
  }
  assert {
    condition     = google_artifact_registry_repository_iam_member.deploy_reads.role == "roles/artifactregistry.reader"
    error_message = "The deploy pipeline should only read images."
  }
  assert {
    condition = alltrue([
      for m in google_project_iam_member.build : m.role != "roles/run.admin"
    ])
    error_message = "The build pipeline should not deploy."
  }
  assert {
    condition     = contains([for m in google_project_iam_member.deploy : m.role], "roles/run.admin")
    error_message = "The deploy pipeline should deploy."
  }
}

run "the_secret_is_the_one_the_service_reads" {
  command = plan

  assert {
    condition     = google_secret_manager_secret.api_key.secret_id == "model-host-api-key"
    error_message = "The secret should be the one the service reads."
  }
}
