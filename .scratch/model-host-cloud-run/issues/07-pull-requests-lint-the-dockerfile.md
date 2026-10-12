# 07 — Pull requests lint the Dockerfile

**What to build:** A pull request that changes anything under the model directory gets a check that lints the Dockerfile, so that mistakes are caught before merge. Nothing is built and nothing is deployed until the merge itself.

It is a second Cloud Build trigger, created by the bootstrap script beside the one from ticket 06, and it reuses the repository connection that ticket set up.

See `docs/specs/model-host-cloud-run.md`, section "The pipeline".

**Blocked by:** 06 — A merge deploys the model host.

**Status:** ready-for-agent

- [ ] The bootstrap script creates a trigger for pull requests that change anything under the model directory. Running the script again does not create a second one.
- [ ] The trigger lints the Dockerfile and reports a pass or a fail as a check on the pull request.
- [ ] The trigger builds no image, pushes nothing and deploys nothing.
- [ ] A pull request that leaves the model directory alone starts no build.
- [ ] A pull request with a deliberate lint error has been seen to fail the check.
- [ ] The Dockerfile as merged passes, with any rule that is switched off named and explained beside it.
