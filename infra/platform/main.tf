# What the model host is assembled from: the APIs, the Docker repository, the
# bucket the weights are mirrored into, the bucket the Terraform state is kept
# in, and the API key's secret. Applied by hand; see the README.

resource "google_project_service" "apis" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "developerconnect.googleapis.com",
    "iam.googleapis.com",
    "logging.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
  ])

  service = each.value
  # Other things in the project may use them.
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "model_host" {
  repository_id = "model-host"
  location      = var.region
  format        = "DOCKER"
  description   = "Images of the model host"

  depends_on = [google_project_service.apis]
}

# model/mirror-weights.sh puts the weights file here, and the weights image is
# built from it.
resource "google_storage_bucket" "weights" {
  name                        = "${var.project}-model-weights"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  depends_on = [google_project_service.apis]
}

# The state of this configuration and of infra/service, under the prefixes
# their backends name. Kept in versions, so a bad apply can be undone.
resource "google_storage_bucket" "state" {
  name                        = "${var.project}-tfstate"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }

  depends_on = [google_project_service.apis]
}

# The secret only. Its value, the key, is added with gcloud as the README
# shows, so that it is never held in Terraform's state.
resource "google_secret_manager_secret" "api_key" {
  secret_id = "model-host-api-key"

  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [google_project_service.apis]
}
