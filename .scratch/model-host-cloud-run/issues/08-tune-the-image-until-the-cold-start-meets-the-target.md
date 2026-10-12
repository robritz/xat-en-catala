# 08 — Tune the image until the cold start meets the target

**What to build:** A **cold start** under 60 seconds, reached by measurement and not by guesswork. The plain image from ticket 04 is the baseline. Each candidate change is deployed on its own through the pipeline, the cold start the pipeline logs is compared with the baseline, and the change is kept only if the number improves.

If the baseline already meets the target, this ticket closes with no changes: record the numbers and stop.

The candidates, in the order to try them:

1. Store the weights layer uncompressed, so that nothing is unpacked when the image is fetched.
2. Load the weights fully into memory instead of memory-mapping them, or the reverse, whichever the baseline does not do.
3. Take the weights out of the image and read them from Cloud Storage at start.

Nothing in the documentation says which of these helps on Cloud Run, which is why each is measured. The third changes where the weights live and so departs from the spec; raise it with the owner before trying it.

See `docs/specs/model-host-cloud-run.md`, sections "Images" and "Further Notes". Terms are defined in `CONTEXT.md`.

**Blocked by:** 06 — A merge deploys the model host.

**Status:** ready-for-agent

- [ ] The baseline cold start is taken from at least three pipeline runs, since one run is not a measurement.
- [ ] If the baseline is under 60 seconds in all three, the ticket is closed with the numbers recorded and no change made.
- [ ] Otherwise each candidate is deployed as its own change, with at least three logged cold starts, and nothing else altered in the same deploy.
- [ ] A candidate that does not improve on the baseline is reverted, and its numbers are still recorded.
- [ ] The results are written up as a short table: the variant, its cold starts, and whether it was kept.
- [ ] The Dockerfile and the deploy script carry a comment on each kept variant saying what it bought.
- [ ] If no combination reaches 60 seconds, that is reported to the owner with the best number reached, and ticket 09 is not started.
- [ ] If the weights move out of the image, the spec and the decision record are updated to say so.
