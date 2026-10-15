# The service was first deployed with gcloud, before this configuration
# existed. These adopt it into the state on the first apply, and do nothing
# after that. Against a project where the service does not exist yet, delete
# this file.

import {
  to = google_cloud_run_v2_service.model_host
  id = "projects/${var.project}/locations/${var.region}/services/model-host"
}

import {
  to = google_cloud_run_v2_service_iam_member.anyone
  id = "projects/${var.project}/locations/${var.region}/services/model-host roles/run.invoker allUsers"
}
