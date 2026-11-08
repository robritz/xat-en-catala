# The connection to GitHub and the two triggers a merge to main starts. Each
# result shows on the commit in GitHub as a check named after its trigger.
#
# The connection has to be approved in the browser once, which no apply can
# do: on a first apply the repository link fails, and the output
# github_approval_uri says where to go. Apply again once that is done.
#
# A trigger also fails if its account's roles were granted moments before,
# since they take a minute to take effect. Apply again if it does.

resource "google_developer_connect_connection" "github" {
  connection_id = "github"
  location      = var.region

  github_config {
    github_app = "DEVELOPER_CONNECT"
  }

  depends_on = [google_project_service.apis]
}

resource "google_developer_connect_git_repository_link" "repository" {
  git_repository_link_id = "xat-en-catala"
  parent_connection      = google_developer_connect_connection.github.connection_id
  location               = var.region
  clone_uri              = "https://github.com/${var.github_repository}.git"
}

# The models, each with a model host of its own, and what their pipelines
# need to know of them. Each model's directory under model/ holds its
# Dockerfile, and infra/service's models hold its service's settings, under
# the same service name and workspace as here.
#
# Salamandra's image, service, secret and workspace keep the names they had
# when it was the only model, so that nothing already made is replaced.
locals {
  models = {
    salamandra = {
      image          = "service"
      service        = "model-host"
      secret         = google_secret_manager_secret.api_key.secret_id
      workspace      = "default"
      target_seconds = 60
    }
    # ALIA's slowest cold start was 30.5 seconds, on a revision's first
    # instance. Its target is about three times that, as Salamandra's 60 is
    # to its 20.
    alia = {
      image          = "alia"
      service        = "model-host-alia"
      secret         = google_secret_manager_secret.alia_api_key.secret_id
      workspace      = "alia"
      target_seconds = 90
    }
  }
}

# Builds a model's service image when its directory changes. It finds nothing
# to build when the Dockerfile is unchanged.
resource "google_cloudbuild_trigger" "build" {
  for_each = local.models

  name            = "${each.value.service}-build"
  location        = var.region
  description     = "Builds ${each.key}'s service image when a merge to main changes model/${each.key}/"
  filename        = "model/cloudbuild.yaml"
  included_files  = ["model/${each.key}/**"]
  service_account = google_service_account.build.id

  substitutions = {
    _MODEL      = each.key
    _IMAGE_NAME = each.value.image
  }

  developer_connect_event_config {
    git_repository_link = google_developer_connect_git_repository_link.repository.id
    push {
      branch = "^main$"
    }
  }

  # Cloud Build refuses a trigger whose account cannot yet read the connection.
  depends_on = [google_project_iam_member.build_project_roles]
}

# Deploys a model's service image when its Dockerfile, which decides the
# image, or the service's Terraform, which holds every model's settings,
# changes. It waits for the build trigger's image. Changes to the pipeline or
# its scripts alone deploy nothing, since they would make no new revision and
# the message would time a warm one.
resource "google_cloudbuild_trigger" "deploy" {
  for_each = local.models

  name            = "${each.value.service}-deploy"
  location        = var.region
  description     = "Deploys ${each.key}'s model host when a merge to main changes its image or its service"
  filename        = "infra/service/cloudbuild.yaml"
  included_files  = ["model/${each.key}/Dockerfile", "infra/service/*.tf"]
  service_account = google_service_account.deploy.id

  substitutions = {
    _MODEL          = each.key
    _IMAGE_NAME     = each.value.image
    _SERVICE        = each.value.service
    _SECRET         = each.value.secret
    _WORKSPACE      = each.value.workspace
    _TARGET_SECONDS = tostring(each.value.target_seconds)
  }

  developer_connect_event_config {
    git_repository_link = google_developer_connect_git_repository_link.repository.id
    push {
      branch = "^main$"
    }
  }

  # Cloud Build refuses a trigger whose account cannot yet read the connection.
  depends_on = [google_project_iam_member.deploy_project_roles]
}

# The triggers were made before there was more than one model.
moved {
  from = google_cloudbuild_trigger.build
  to   = google_cloudbuild_trigger.build["salamandra"]
}

moved {
  from = google_cloudbuild_trigger.deploy
  to   = google_cloudbuild_trigger.deploy["salamandra"]
}
