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

# Builds the service image when model/ changes. It finds nothing to build when
# the Dockerfile is unchanged.
resource "google_cloudbuild_trigger" "build" {
  name            = "model-host-build"
  location        = var.region
  description     = "Builds the model host's service image when a merge to main changes model/"
  filename        = "model/cloudbuild.yaml"
  included_files  = ["model/**"]
  service_account = google_service_account.build.id

  developer_connect_event_config {
    git_repository_link = google_developer_connect_git_repository_link.repository.id
    push {
      branch = "^main$"
    }
  }

  # Cloud Build refuses a trigger whose account cannot yet read the connection.
  depends_on = [google_project_iam_member.build_project_roles]
}

# Deploys the service image when the Dockerfile, which decides the image, or
# the service's Terraform changes. It waits for the build trigger's image.
# Changes to the pipeline or its scripts alone deploy nothing, since they would
# make no new revision and the message would time a warm one.
resource "google_cloudbuild_trigger" "deploy" {
  name            = "model-host-deploy"
  location        = var.region
  description     = "Deploys the model host when a merge to main changes its image or its service"
  filename        = "infra/service/cloudbuild.yaml"
  included_files  = ["model/Dockerfile", "infra/service/*.tf"]
  service_account = google_service_account.deploy.id

  developer_connect_event_config {
    git_repository_link = google_developer_connect_git_repository_link.repository.id
    push {
      branch = "^main$"
    }
  }

  # Cloud Build refuses a trigger whose account cannot yet read the connection.
  depends_on = [google_project_iam_member.deploy_project_roles]
}
