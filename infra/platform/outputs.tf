output "github_approval_uri" {
  description = "Where to approve the connection to GitHub, while it waits for that. Empty once it is approved."
  value       = one(google_developer_connect_connection.github.installation_state[*].action_uri)
}

output "build_service_account" {
  description = "The build pipeline's service account, which also builds the weights image."
  value       = google_service_account.build.id
}

output "deploy_service_account" {
  description = "The deploy pipeline's service account."
  value       = google_service_account.deploy.id
}
