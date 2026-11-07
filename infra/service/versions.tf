terraform {
  required_version = ">= 1.10"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.7"
    }
  }

  # The bucket is created by infra/platform, which keeps its own state beside
  # these under another prefix. Each model's host has a state of its own, so
  # the prefix is given at init, from infra/platform's models: "service" for
  # Salamandra. There is no default, so that no model's apply can reach
  # another's state.
  backend "gcs" {
    bucket = "project-45649980-817a-462c-b12-tfstate"
  }
}

provider "google" {
  project = var.project
  region  = var.region
}
