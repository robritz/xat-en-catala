terraform {
  required_version = ">= 1.10"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.7"
    }
  }

  # The bucket is created by infra/platform, which keeps its own state beside
  # this one under another prefix.
  backend "gcs" {
    bucket = "project-45649980-817a-462c-b12-tfstate"
    prefix = "service"
  }
}

provider "google" {
  project = var.project
  region  = var.region
}
