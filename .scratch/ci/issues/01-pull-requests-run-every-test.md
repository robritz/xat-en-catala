# 01 — Pull requests run every test

**What to build:** Every pull request, and every push to `main`, runs all of the repository's checks, and a pull request that fails one cannot be merged. Today nothing runs them: `npm test` is run by hand, the Terraform tests are run by hand from the commands in the README's "Testing the Terraform", and Vercel's build is the only thing a pull request sets off besides the model host's triggers.

It is a GitHub Actions workflow, `.github/workflows/test.yml`. The checks it runs:

- the app: `npm ci`, then `npx tsc --noEmit`, `npm run lint` and `npm test -- --run`;
- the Terraform, in `infra/platform` and in `infra/service` each: `terraform init -backend=false`, `terraform fmt -check` and `terraform test`, with Terraform pinned to the version the deploy pipeline uses (`hashicorp/terraform:1.16.6` in `infra/service/cloudbuild.yaml`).

The Terraform tests plan against a mocked provider and reach nothing in Google Cloud, so the workflow needs no credentials and no secrets, and a pull request from a fork can run it safely.

**Decided by the owner:** the Dockerfile's hadolint check runs in this workflow, so that every check lives in one place. It replaces ticket 07 of `model-host-cloud-run`, whose Cloud Build trigger, in PR #35, is not merged. A rule switched off in the Dockerfile is named and explained beside it.

**Blocked by:** none.

**Status:** in-progress

- [ ] The workflow runs on every pull request to `main` and every push to `main`, and its result shows on the pull request as a check.
- [ ] The app's typecheck, lint and tests run, and a failure in any one fails the check.
- [ ] Both Terraform configurations are initialised without a backend, checked for formatting and tested, and a failure in any one fails the check.
- [ ] Terraform's version in the workflow matches the deploy pipeline's, with a comment beside each saying the other must change with it.
- [ ] The workflow uses no secrets and no Google credentials.
- [x] A pull request with a deliberately failing vitest test, and one with a deliberately failing Terraform assertion, have each been seen to fail the check.
- [ ] Branch protection on `main` requires the check before a merge. This is set in GitHub's settings by the owner or on their explicit instruction.
- [x] The decision on hadolint is recorded here, and carried out: the check runs in the workflow, and the Cloud Build lint trigger was never merged.
- [x] The Dockerfile passes hadolint, and a pull request with a deliberate lint error has been seen to fail the check.
- [ ] The README says what runs on a pull request and where to see it, beside "Testing the Terraform" and the npm scripts.

## Progress

PR #37. Its first run failed the typecheck: `LayoutProps` is a type Next writes into `.next/`, which a fresh checkout lacks, so the workflow runs `next typegen` first.

Commit `96cc282` added a failing vitest test, a failing assertion in `infra/platform`'s tests and `RUN cd /tmp` in the Dockerfile. Run `38749000185` failed `app` (`expected 1 to be 2`), `terraform (infra/platform)` (`Deliberate failure.`) and `dockerfile` (DL3003), and passed `terraform (infra/service)`, which was left alone. The next commit reverted all three, and run `38749280110` passed.
