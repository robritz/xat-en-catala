---
status: accepted
---

# Describe the model host in Terraform, and build and deploy it in separate pipelines

The model host's cloud resources were made by a gcloud script, `model/bootstrap.sh`, and the service by another, `model/deploy.sh`, which one Cloud Build pipeline called after building the image. We now describe them in Terraform. `infra/platform` holds what the host is assembled from and is applied by hand. `infra/service` holds the Cloud Run service and is applied by a deploy pipeline. That pipeline is separate from the build pipeline: it has its own trigger, its own configuration and its own service account. The build pipeline can push images but not deploy, and the deploy pipeline can deploy but not push.

The two pipelines run on the same merge and never call each other. The service image is tagged with the checksum of `model/Dockerfile`, which alone decides what the image holds (`model/image-tag.sh`). The build pipeline pushes an image under that tag, or does nothing if one is there already. The deploy pipeline works out the same tag and waits for an image under it. A merge that changes only the service skips the wait, since its image is already pushed.

## Considered Options

- **Chain the pipelines through Artifact Registry's Pub/Sub notifications.** This would start the deploy only once the image exists. But a Pub/Sub trigger cannot fetch its source through the Developer Connect link this repository uses, and the deploy needs the Terraform files.
- **Have the build pipeline start the deploy trigger.** The build's account would then need to run triggers and act as the deploy's account, which gives the build the power to deploy.
- **Tag images with the commit.** The deploy could not tell whether a merge was going to produce an image, so it would wait in vain whenever only the service changed.
- **Keep the API key's value in Terraform.** It would sit in the state. The secret is in Terraform, but the key is added to it with gcloud, as before.

## Consequences

- When the build pipeline fails, the deploy pipeline waits 50 minutes before it fails too.
- A change to the deploy pipeline or its scripts alone starts no deploy. It would make no new revision, and the message would time a warm one as a cold start.
- Changing the Dockerfile, even a comment, makes a new image and a new revision. A change elsewhere in `model/` makes neither.
- Revisions are named by whoever applies: the deploy pipeline names each one after its build. On its first run, the pipeline read the new revision's name back from Terraform, and Cloud Run still gave the revision before, a broken one, which then took all traffic.
- The state of both configurations is in a GCS bucket that is made by hand before the first `terraform init`.
- The resources the scripts made were adopted with `import` blocks, which were removed once both states held them. The old pipeline's account, `model-host-pipeline`, was not adopted, and is deleted by hand.
- The deploy no longer starts an instance to check the revision (`health_check_disabled`), including when someone applies `infra/service` by hand. Only the startup probe keeps requests away from an instance that is not ready.
