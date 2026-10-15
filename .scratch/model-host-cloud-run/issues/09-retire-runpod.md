# 09 — Retire RunPod

**What to build:** Learners are served by the Cloud Run **model host** alone. The hosted app's variables are pointed at Cloud Run, the RunPod endpoint is deleted, and nothing in the repository still describes RunPod as where the model runs.

This happens only once Cloud Run is proven, which means all three of: the owner judged its **replies** as good as RunPod's (ticket 05); token counts arrive with streamed replies (ticket 05); and three measured **cold starts** are under 60 seconds (tickets 06 and 08).

See `docs/specs/model-host-cloud-run.md`, sections "Retiring RunPod" and "Documentation". Terms are defined in `CONTEXT.md`.

**Needs the owner:** Changing the hosted app's variables and deleting the endpoint are the owner's to do or to approve explicitly. Deleting the endpoint cannot be undone; do not do it on an earlier or general go-ahead.

**Blocked by:** 05 — The app against Cloud Run, compared with RunPod; 06 — A merge deploys the model host; 08 — Tune the image until the cold start meets the target.

**Status:** ready-for-agent

- [x] The three proofs are listed in the ticket with where each was recorded, and all three hold:
  - Replies as good as RunPod's: the owner's verdict of 2026-10-15, in ticket 05, "The verdict".
  - Token counts with streamed replies: ticket 05, its box on the server's `reply_tokens` log line.
  - Three cold starts under 60 seconds: ticket 08, "Result": four pipeline deploys at 10.7 to 17.9 seconds.
- [ ] The hosted app's `MODEL_HOST_URL` and `MODEL_HOST_API_KEY` point at Cloud Run, and a session started on the hosted app gets its greeting from Cloud Run.
- [ ] The hosted app has run on Cloud Run for an agreed period, set by the owner, before the endpoint is deleted, so that there is a way back.
- [ ] The RunPod endpoint is deleted, by the owner or on their explicit instruction.
- [ ] The RunPod API key is revoked if nothing else uses it.
- [ ] The RunPod commands are removed from `CLAUDE.md`.
- [ ] The README describes Cloud Run as where the model runs: the opening paragraph, the diagram, the cold start and how long it takes, and the advice on avoiding it.
- [ ] The comment on the chat route's time limit and the wait it allows for is brought in line with the new cold start. Whether to lower the limit itself is put to the owner, not decided here.
- [ ] If the owner lowers the chat route's limit, the service's request timeout in `infra/service/main.tf`, which matches it, is lowered with it, and its comment still says so.
- [ ] No reference to RunPod remains in the repository, other than in the decision record, the spec and the recorded baseline, which are history.
