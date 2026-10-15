# These were first made by a gcloud script, before this configuration existed.
# These adopt them into the state on the first apply, and do nothing after
# that. Against a project where they do not exist yet, delete this file.
#
# The state bucket is made by hand before the first init, as the README shows,
# and adopted here too.

import {
  to = google_artifact_registry_repository.model_host
  id = "projects/${var.project}/locations/${var.region}/repositories/model-host"
}

import {
  to = google_storage_bucket.weights
  id = "${var.project}-model-weights"
}

import {
  to = google_storage_bucket.state
  id = "${var.project}-tfstate"
}

import {
  to = google_service_account.service
  id = "projects/${var.project}/serviceAccounts/model-host@${var.project}.iam.gserviceaccount.com"
}

import {
  to = google_secret_manager_secret.api_key
  id = "projects/${var.project}/secrets/model-host-api-key"
}

import {
  to = google_developer_connect_connection.github
  id = "projects/${var.project}/locations/${var.region}/connections/github"
}

import {
  to = google_developer_connect_git_repository_link.repository
  id = "projects/${var.project}/locations/${var.region}/connections/github/gitRepositoryLinks/xat-en-catala"
}

# The trigger that ran the old pipeline, which built and deployed in one. It
# becomes the deploy trigger. Cloud Build finds a trigger by its name as well
# as its ID.
import {
  to = google_cloudbuild_trigger.deploy
  id = "projects/${var.project}/locations/${var.region}/triggers/model-host-deploy"
}
