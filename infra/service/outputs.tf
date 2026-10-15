output "url" {
  description = "The service's URL. The app's MODEL_HOST_URL is this followed by /v1."
  value       = google_cloud_run_v2_service.model_host.uri
}

output "image" {
  description = "The image the latest revision runs."
  value       = var.image
}

# The pipeline sends its message to these.

output "candidate_revision" {
  description = "The name of the latest revision."
  value       = reverse(split("/", google_cloud_run_v2_service.model_host.latest_created_revision))[0]
}

output "candidate_url" {
  description = "The URL of the tag candidate, which reaches the latest revision whatever traffic it takes."
  value       = one([for t in google_cloud_run_v2_service.model_host.traffic_statuses : t.uri if t.tag == "candidate"])
}
