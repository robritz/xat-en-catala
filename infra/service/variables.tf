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

variable "revision" {
  description = <<-EOT
    The name of the latest revision. A new name makes a new revision; the
    name of the latest one, from the output revision, keeps it. The deploy
    pipeline names each revision after its build, so it never has to read the
    name back from Cloud Run, which can still give the one before.
  EOT
  type        = string

  validation {
    condition     = can(regex("^model-host-[a-z0-9-]+$", var.revision))
    error_message = "Name the revision model-host- followed by lowercase letters, digits and dashes."
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
