variable "project" {
  description = "The project the model host runs in."
  type        = string
  default     = "project-45649980-817a-462c-b12"
}

variable "region" {
  description = "The region the model host runs in."
  type        = string
  default     = "europe-west4"
}

variable "image" {
  description = "The service image to run. The deploy pipeline names it by digest."
  type        = string

  validation {
    condition     = var.image != ""
    error_message = "Name the service image to run."
  }
}

variable "serving_revision" {
  description = <<-EOT
    A revision to keep all traffic on. The latest revision then takes none, and
    is reachable only under the tag "candidate". Left empty, all traffic goes
    to the latest revision.
  EOT
  type        = string
  default     = ""
}
