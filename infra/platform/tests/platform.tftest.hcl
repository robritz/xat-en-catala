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
    condition     = toset(google_cloudbuild_trigger.deploy.included_files) == toset(["model/Dockerfile", "infra/service/*.tf"])
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

run "a_pull_request_that_changes_model_is_linted" {
  command = plan

  assert {
    condition     = google_cloudbuild_trigger.lint.filename == "model/cloudbuild-lint.yaml"
    error_message = "The lint trigger should run the lint pipeline."
  }
  assert {
    condition     = google_cloudbuild_trigger.lint.included_files == tolist(["model/**"])
    error_message = "A pull request should be linted only when model/ changes."
  }
  assert {
    condition     = google_cloudbuild_trigger.lint.developer_connect_event_config[0].pull_request[0].branch == "^main$"
    error_message = "The lint pipeline should run on pull requests to main."
  }
  assert {
    condition     = length(google_cloudbuild_trigger.lint.developer_connect_event_config[0].push) == 0
    error_message = "The lint pipeline should not run on a merge."
  }
}

run "the_lint_pipeline_can_neither_push_nor_deploy" {
  command = plan

  # An id of its own, known at plan, so the trigger is seen to run as this
  # account and not merely as one with the mock's default id.
  override_resource {
    target          = google_service_account.lint
    override_during = plan
    values = {
      id     = "projects/p/serviceAccounts/model-host-lint@p.iam.gserviceaccount.com"
      member = "serviceAccount:model-host-lint@p.iam.gserviceaccount.com"
    }
  }

  assert {
    condition     = google_service_account.lint.account_id == "model-host-lint"
    error_message = "The lint pipeline should have its own service account."
  }
  assert {
    condition     = google_cloudbuild_trigger.lint.service_account == google_service_account.lint.id
    error_message = "The lint trigger should run as the lint pipeline's account."
  }
  assert {
    condition     = toset([for m in google_project_iam_member.lint_project_roles : m.role]) == toset(local.pipeline_roles)
    error_message = "The lint pipeline should only fetch the repository and write its logs."
  }
}
