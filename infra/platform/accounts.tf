# The service accounts the model host and its two pipelines run as, and what
# each may do. Neither pipeline runs as the default compute service account.

resource "google_service_account" "service" {
  account_id   = "model-host"
  display_name = "Model host service"

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "build" {
  account_id   = "model-host-build"
  display_name = "Model host build pipeline"

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "deploy" {
  account_id   = "model-host-deploy"
  display_name = "Model host deploy pipeline"

  depends_on = [google_project_service.apis]
}

locals {
  # What both pipelines need: to fetch this repository through the connection
  # to GitHub, and to write their build logs.
  pipeline_roles = [
    "roles/developerconnect.readTokenAccessor",
    "roles/logging.logWriter",
  ]
}

# The service reads the key, and nothing else.
resource "google_secret_manager_secret_iam_member" "service_reads_key" {
  secret_id = google_secret_manager_secret.api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.service.member
}

# The build pipeline pushes images to the repository, and reads the weights
# file to build the weights image. It deploys nothing.

resource "google_project_iam_member" "build" {
  for_each = toset(local.pipeline_roles)

  project = var.project
  role    = each.value
  member  = google_service_account.build.member
}

resource "google_artifact_registry_repository_iam_member" "build_pushes" {
  repository = google_artifact_registry_repository.model_host.name
  location   = google_artifact_registry_repository.model_host.location
  role       = "roles/artifactregistry.writer"
  member     = google_service_account.build.member
}

resource "google_storage_bucket_iam_member" "build_reads_weights" {
  bucket = google_storage_bucket.weights.name
  role   = "roles/storage.objectViewer"
  member = google_service_account.build.member
}

# The deploy pipeline reads the image the build pushed, applies infra/service
# with its state in the state bucket, which includes opening the service to
# unauthenticated requests, as the service's account and no other, and reads
# the key, to send a new revision its test message. It builds nothing.

resource "google_project_iam_member" "deploy" {
  for_each = toset(concat(local.pipeline_roles, ["roles/run.admin"]))

  project = var.project
  role    = each.value
  member  = google_service_account.deploy.member
}

resource "google_artifact_registry_repository_iam_member" "deploy_reads" {
  repository = google_artifact_registry_repository.model_host.name
  location   = google_artifact_registry_repository.model_host.location
  role       = "roles/artifactregistry.reader"
  member     = google_service_account.deploy.member
}

resource "google_storage_bucket_iam_member" "deploy_keeps_state" {
  bucket = google_storage_bucket.state.name
  role   = "roles/storage.objectAdmin"
  member = google_service_account.deploy.member
}

resource "google_service_account_iam_member" "deploy_acts_as_service" {
  service_account_id = google_service_account.service.name
  role               = "roles/iam.serviceAccountUser"
  member             = google_service_account.deploy.member
}

resource "google_secret_manager_secret_iam_member" "deploy_reads_key" {
  secret_id = google_secret_manager_secret.api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = google_service_account.deploy.member
}
