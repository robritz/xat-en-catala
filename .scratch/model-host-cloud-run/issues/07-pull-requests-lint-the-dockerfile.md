# 07 — Pull requests lint the Dockerfile

**What to build:** A pull request that changes anything under the model directory gets a check that lints the Dockerfile, so that mistakes are caught before merge. Nothing is built and nothing is deployed until the merge itself.

It is a third Cloud Build trigger, described in `infra/platform/pipelines.tf` beside the build and deploy triggers, and it reuses their repository link. It runs as an account of its own that can write logs and read the connection and nothing else: a pull request's code is not yet reviewed, so the check must not be able to push an image or deploy, as the build and deploy accounts can. See `docs/adr/0002-terraform-and-separate-build-and-deploy-pipelines.md`.

`model/bootstrap.sh`, which this ticket first named, was replaced by `infra/platform`, which is applied by hand.

See `docs/specs/model-host-cloud-run.md`, section "The pipeline".

**Blocked by:** 06 — A merge deploys the model host.

**Status:** ready-for-agent

- [ ] `infra/platform` describes a trigger for pull requests to `main` that change anything under the model directory, running as its own service account with only the roles it needs. Its tests cover the trigger and the account. A second apply changes nothing.
- [ ] The trigger lints the Dockerfile and reports a pass or a fail as a check on the pull request.
- [ ] The trigger builds no image, pushes nothing and deploys nothing.
- [ ] A pull request that leaves the model directory alone starts no build.
- [ ] A pull request with a deliberate lint error has been seen to fail the check.
- [ ] The Dockerfile as merged passes, with any rule that is switched off named and explained beside it. The `# hadolint ignore=DL3006` already there has no explanation yet.
