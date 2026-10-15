terraform {
  required_version = ">= 1.10"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.7"
    }
  }

  # The bucket is one this configuration manages, google_storage_bucket.state.
  # It has to exist before the first init, as the README shows.
  backend "gcs" {
    bucket = "project-45649980-817a-462c-b12-tfstate"
    prefix = "platform"
  }
}

provider "google" {
  project = var.project
  region  = var.region
}
