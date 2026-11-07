# Plans the platform against a mocked provider: nothing reaches Google.
#
#   terraform -chdir=infra/platform init -backend=false
#   terraform -chdir=infra/platform test

mock_provider "google" {
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

run "build_and_deploy_are_separate_pipelines" {
  command = plan

  assert {
    condition     = google_cloudbuild_trigger.build["salamandra"].filename == "model/cloudbuild.yaml"
    error_message = "The build trigger should run the shared build pipeline."
  }
  assert {
    condition     = google_cloudbuild_trigger.deploy["salamandra"].filename == "infra/service/cloudbuild.yaml"
    error_message = "The deploy trigger should run the shared deploy pipeline."
  }
  assert {
    condition = alltrue([
      for t in concat(values(google_cloudbuild_trigger.build), values(google_cloudbuild_trigger.deploy)) :
      t.developer_connect_event_config[0].push[0].branch == "^main$"
    ])
    error_message = "Every pipeline should run on a merge to main."
  }
}

# Salamandra's triggers keep their names, so that they are updated and not
# replaced.
run "salamandra_keeps_its_triggers" {
  command = plan

  assert {
    condition     = google_cloudbuild_trigger.build["salamandra"].name == "model-host-build" && google_cloudbuild_trigger.deploy["salamandra"].name == "model-host-deploy"
    error_message = "Salamandra's triggers should keep their names."
  }
}

run "each_model_builds_and_deploys_only_on_its_own_changes" {
  command = plan

  assert {
    condition     = google_cloudbuild_trigger.build["salamandra"].included_files == tolist(["model/salamandra/**"])
    error_message = "Salamandra should build only when its directory changes."
  }
  assert {
    condition     = toset(google_cloudbuild_trigger.deploy["salamandra"].included_files) == toset(["model/salamandra/Dockerfile", "infra/service/*.tf"])
    error_message = "Salamandra should deploy only when its image or the service changes."
  }
}

run "each_model_passes_its_settings_to_the_pipelines" {
  command = plan

  assert {
    condition = google_cloudbuild_trigger.build["salamandra"].substitutions == tomap({
      _MODEL      = "salamandra"
      _IMAGE_NAME = "service"
    })
    error_message = "Salamandra's build should be told its directory and image name."
  }
  assert {
    condition = google_cloudbuild_trigger.deploy["salamandra"].substitutions == tomap({
      _MODEL          = "salamandra"
      _IMAGE_NAME     = "service"
      _SERVICE        = "model-host"
      _SECRET         = "model-host-api-key"
      _WORKSPACE      = "default"
      _TARGET_SECONDS = "60"
    })
    error_message = "Salamandra's deploy should be told its service, secret, workspace and a 60-second target."
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
      for m in google_project_iam_member.build_project_roles : m.role != "roles/run.admin"
    ])
    error_message = "The build pipeline should not deploy."
  }
  assert {
    condition     = contains([for m in google_project_iam_member.deploy_project_roles : m.role], "roles/run.admin")
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

# ALIA's host checks a key of its own, so that a leaked key reaches one host
# and not both.
run "alia_has_its_own_key" {
  # Applied against the mocked provider, so that the account's member is known.
  command = apply

  assert {
    condition     = google_secret_manager_secret.alia_api_key.secret_id == "model-host-alia-api-key"
    error_message = "ALIA's key should have a secret of its own."
  }
  assert {
    condition     = google_secret_manager_secret_iam_member.service_reads_alia_key.role == "roles/secretmanager.secretAccessor" && google_secret_manager_secret_iam_member.service_reads_alia_key.member == google_service_account.service.member
    error_message = "The model hosts' service account should read ALIA's key."
  }
}
