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

variable "model" {
  description = "The model whose host this is, one of local.models: salamandra or alia."
  type        = string

  validation {
    condition     = contains(keys(local.models), var.model)
    error_message = "Name a model in local.models."
  }
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
    condition     = can(regex("^${local.models[var.model].service}-[a-z0-9-]+$", var.revision)) && !anytrue([for name, m in local.models : name != var.model && length(m.service) > length(local.models[var.model].service) && startswith(var.revision, "${m.service}-")])
    error_message = "Name the revision after the model's service, followed by a dash and lowercase letters, digits and dashes, and not after another model's service."
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
