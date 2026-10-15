# 01 — Pull requests run every test

**What to build:** Every pull request, and every push to `main`, runs all of the repository's checks, and a pull request that fails one cannot be merged. Today nothing runs them: `npm test` is run by hand, the Terraform tests are run by hand from the commands in the README's "Testing the Terraform", and Vercel's build is the only thing a pull request sets off besides the model host's triggers.

It is a GitHub Actions workflow, `.github/workflows/test.yml`. The checks it runs:

- the app: `npm ci`, then `npx tsc --noEmit`, `npm run lint` and `npm test -- --run`;
- the Terraform, in `infra/platform` and in `infra/service` each: `terraform init -backend=false`, `terraform fmt -check` and `terraform test`, with Terraform pinned to the version the deploy pipeline uses (`hashicorp/terraform:1.16.6` in `infra/service/cloudbuild.yaml`).

The Terraform tests plan against a mocked provider and reach nothing in Google Cloud, so the workflow needs no credentials and no secrets, and a pull request from a fork can run it safely.

**Decide with the owner first:** whether the Dockerfile's hadolint check moves into this workflow too. If it does, the Cloud Build trigger `model-host-lint` from ticket 07 of `model-host-cloud-run` (PR #35), with its pipeline, its account and its `/gcbrun` gate, is no longer needed and is removed. If it does not, both checks run on a pull request that changes `model/`.

**Blocked by:** none.

**Status:** ready-for-agent

- [ ] The workflow runs on every pull request to `main` and every push to `main`, and its result shows on the pull request as a check.
- [ ] The app's typecheck, lint and tests run, and a failure in any one fails the check.
- [ ] Both Terraform configurations are initialised without a backend, checked for formatting and tested, and a failure in any one fails the check.
- [ ] Terraform's version in the workflow matches the deploy pipeline's, with a comment beside each saying the other must change with it.
- [ ] The workflow uses no secrets and no Google credentials.
- [ ] A pull request with a deliberately failing vitest test, and one with a deliberately failing Terraform assertion, have each been seen to fail the check.
- [ ] Branch protection on `main` requires the check before a merge. This is set in GitHub's settings by the owner or on their explicit instruction.
- [ ] The decision on hadolint is recorded here, and carried out: the check moved into the workflow and the Cloud Build lint trigger removed, or left as it is.
- [ ] The README says what runs on a pull request and where to see it, beside "Testing the Terraform" and the npm scripts.
