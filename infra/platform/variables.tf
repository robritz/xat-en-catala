variable "project" {
  description = "The project the model host is built and runs in."
  type        = string
  default     = "project-45649980-817a-462c-b12"
}

variable "region" {
  description = "The region everything is in."
  type        = string
  default     = "europe-west4"
}

variable "github_repository" {
  description = "The GitHub repository the pipelines build from, as owner/name."
  type        = string
  default     = "robritz/xat-en-catala"
}
