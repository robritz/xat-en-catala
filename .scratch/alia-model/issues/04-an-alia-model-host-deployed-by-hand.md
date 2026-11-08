# 04 — An ALIA model host, deployed by hand

**What to build:** ALIA answering from Cloud Run. A service image puts ALIA's weights on top of the same llama.cpp server as Salamandra's, with the same flags, and one apply of the service configuration with ALIA's settings by hand produces `model-host-alia` on an RTX PRO 6000. It streams a **reply** to a request with its key, refuses one without, and costs nothing when idle. Its first real **cold start** is measured, which sets ALIA's target in ticket 05 and may send the choice of weights back for review.

See `docs/specs/alia-model.md`, sections "Weights and GPU", "Images", "The service and its pipelines" and "The cold start", and `docs/adr/0003-alia-q8-on-rtx-pro-6000.md`.

**Needs the owner:** The first apply starts an RTX PRO 6000 instance. Ask before applying.

**Blocked by:** 03 — ALIA's cloud resources and weights image.

**Status:** done

- [x] ALIA's Dockerfile starts from the same pinned engine image as Salamandra's, copies the weights from ALIA's weights image into a layer of their own, runs as an unprivileged user, and passes Salamandra's flags with ALIA's weights file and served name.
- [x] The server's `--alias` is `BSC-LT/ALIA-40b-instruct-2601`, the name ticket 01 requests ALIA under. A different alias means every request to ALIA fails.
- [x] The pull-request lint covers ALIA's Dockerfile.
- [x] ALIA's service image build reuses the previous image as a cache, with a disk and timeout large enough for its weights, so that a build changing only a flag keeps the weights layer's digest.
- [x] Applied with ALIA's settings and its own state, the service configuration makes `model-host-alia`: one RTX PRO 6000, 20 CPUs, 80 GiB, zero to one instance, four requests at once, zonal redundancy off, a startup probe on the health route that allows for ALIA's load time, and ALIA's key from its secret. Salamandra's service is untouched.
- [x] The server logs four slots of 8,192 tokens, and the chat template embedded in the weights file.
- [x] A streamed chat completion with the key comes back in Catalan and ends with its token counts. Without the key, or with a wrong one, it is refused.
- [x] After the idle period the service shows no running instance.
- [x] The cold start is measured at least three times from zero instances, and recorded in this ticket with how it splits between fetching the image, loading the weights and the reply starting, as far as the logs show.
- [x] If the cold start is far over three minutes, that is reported to the owner, with the Q6_K fallback, before ticket 05 starts. (It is not: the slowest was 30.5 seconds.)
- [x] The guide describes ALIA's image and how to deploy it by hand.

## Notes from ticket 02

- ALIA's service settings go in `models` in the service's Terraform, with the workspace `alia`, and in infra/platform's `models` under the same service name and workspace.
- The service refuses to plan a model outside its own workspace, and `terraform test` always plans in the default workspace. A run for ALIA can therefore only expect that failure, not assert ALIA's settings. Find a way to test ALIA's values that does not loosen the guard, or say in this ticket why they are left to the first apply.

## Notes from the code

- ALIA's values are tested in its own workspace: `terraform test` plans in the workspace `TF_WORKSPACE` names, so `infra/service/tests/alia` runs with `TF_WORKSPACE=alia`, and CI runs it as a step of its own. The guard is unchanged.
- ALIA is not yet in infra/platform's `models`: an entry there makes its triggers, which are ticket 05's.
- The request timeout (900 s) and the startup probe (15 minutes) are provisional, for the first apply. Ticket 05 sets the timeout from the measured cold start.
- The shared build pipeline now has a 300 GB disk and a two-hour timeout, for Salamandra's builds too: Cloud Build takes no substitution for either.
- `time-reply.js` takes the served name, since it asked for Salamandra's by name.

## Outcome

Done on 2026-11-08 on `feat/alia-host`, with the owner's go for the build, the apply and the measurements.

- The service image `alia:40cf61103bbf` (`sha256:b66c58b0b79c…`) was built by hand with the shared build pipeline.
- The first apply, in the workspace `alia`, added the service and its invoker grant and nothing else. It took about 11½ minutes, nearly all of it Cloud Run importing the image's 43 GB layer, before any instance started. The revision is `model-host-alia-20261108104116`, at `https://model-host-alia-yke3nr54cq-ez.a.run.app`.
- The server logged `n_slots = 4, n_ctx_slot = 8192`. Its `/props` shows the weights file's own chat template (ChatML), since it is given no other.
- With the key, the streamed reply came back in Catalan and ended with its token counts (16 in, 51 to 80 out). With no key, and with a wrong one, the server answered 401.
- The instance shut down 10 minutes after the last request the first time and 5 minutes after it the next two, and each time the instance count then showed none running.

### The cold start

Three measurements from zero instances with `time-reply.js`, the first word as the client saw it. The split is from the instance's logs: from the request to the server starting to load the weights (the instance and container started, the image already imported), to the weights loaded, to the startup probe passing and the first word arriving.

| | First word | Instance and server start | Loading the weights | Probe and first word |
| --- | --- | --- | --- | --- |
| 1 (first instance of the revision) | 30.5 s | 4.5 s | 24.6 s | 1.4 s |
| 2 | 17.5 s | 4.2 s | 12.8 s | 0.5 s |
| 3 | 18.5 s | 4.1 s | 13.0 s | 1.4 s |

Fetching the image does not show in the cold start: Cloud Run imports it when the revision is deployed. The first instance read the weights about twice as slowly as the later ones, which suggests a cache on Cloud Run's side that a new revision starts without. Ticket 05's deploy measures exactly that first instance, so 30.5 seconds is the figure to set its target from.

At about 18 to 31 seconds, ALIA is far under the three minutes that would have sent the weights back to Q6_K.
