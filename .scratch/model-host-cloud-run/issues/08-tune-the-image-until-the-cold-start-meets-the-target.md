# 08 — Tune the image until the cold start meets the target

**What to build:** A **cold start** under 60 seconds, reached by measurement and not by guesswork. The image serving now, the plain one from ticket 04 with the weights image named in the Dockerfile, is the baseline. Each candidate change is deployed on its own through the pipeline, the cold start the pipeline logs is compared with the baseline, and the change is kept only if the number improves.

If the baseline already meets the target, this ticket closes with no changes: record the numbers and stop.

**What is known already.** Ticket 06 recorded three cold starts of the baseline, all well under the target, but only one came from the pipeline:

| Revision | Cold start | Source |
| --- | --- | --- |
| `model-host-00002-soc` | 13 s | the deploy pipeline, build `938fbcaf` |
| `model-host-00002-soc` | 13.6 s | a message after the failed deploy |
| `model-host-00001-2cz` | 14.0 s | a message after going back |

The two missing pipeline runs need no change to the repository. The deploy pipeline names each revision after its build, so running the deploy trigger by hand makes a new revision of the same image, and its first message is a real cold start:

```bash
gcloud builds triggers run model-host-deploy --region europe-west4 --branch main
```

Each run moves traffic to its new revision, as a merge would.

**How a candidate reaches the pipeline.** The service image is tagged with the checksum of `model/Dockerfile`, and the deploy trigger runs only on changes to the Dockerfile or to `infra/service/*.tf`. A candidate that changes only `model/cloudbuild.yaml` builds nothing new and deploys nothing; it has to change the Dockerfile too, or widen what the tag is computed from.

The candidates, in the order to try them:

1. Store the weights layer uncompressed, so that nothing is unpacked when the image is fetched. This is a change to how `model/cloudbuild.yaml` builds and pushes, so see above.
2. Load the weights fully into memory instead of memory-mapping them, or the reverse, whichever the baseline does not do.
3. Take the weights out of the image and read them from Cloud Storage at start. This needs a role on the bucket for the service's account in `infra/platform`, applied by hand first, and a volume in `infra/service/main.tf`.

Nothing in the documentation says which of these helps on Cloud Run, which is why each is measured. The third changes where the weights live and so departs from the spec; raise it with the owner before trying it.

See `docs/specs/model-host-cloud-run.md`, sections "Images", "The pipeline" and "Further Notes". Terms are defined in `CONTEXT.md`.

**Blocked by:** 06 — A merge deploys the model host.

**Status:** done, with no change: the baseline meets the target

- [x] The baseline cold start is taken from at least three pipeline runs, since one run is not a measurement. One is recorded above; two more come from running the deploy trigger by hand.
- [x] If the baseline is under 60 seconds in all three, the ticket is closed with the numbers recorded and no change made.
- [ ] *Not needed: no candidate was tried.* Otherwise each candidate is deployed as its own change, with at least three logged cold starts, and nothing else altered in the same deploy.
- [ ] *Not needed: no candidate was tried.* A candidate that does not improve on the baseline is reverted, and its numbers are still recorded.
- [x] The results are written up as a short table: the variant, its cold starts, and whether it was kept.
- [ ] *Not needed: no candidate was tried.* The file each kept variant changes, `model/Dockerfile`, `model/cloudbuild.yaml` or `infra/service/main.tf`, carries a comment saying what it bought.
- [ ] *Not needed: no candidate was tried.* If no combination reaches 60 seconds, that is reported to the owner with the best number reached, and ticket 09 is not started.
- [ ] *Not needed: no candidate was tried.* If the weights move out of the image, the spec and the decision records are updated to say so.

## Result

No manual runs were needed: the merges after ticket 06 each deployed the baseline image through the pipeline. Every image below has the same engine, weights and server flags as ticket 04's; only comments and how the weights image is named changed in the Dockerfile.

| Variant | Build | Revision | Cold start | Kept |
| --- | --- | --- | --- | --- |
| baseline | `938fbcaf` | `model-host-00002-soc` | 13 s | yes |
| baseline | `50963ca4` | `model-host-50963ca4-9a2f-488f-9b89-7bb5697c2089` | 10.7 s | yes |
| baseline | `287faf02` | `model-host-287faf02-7aab-4381-a522-61d4332c3a10` | 14.5 s | yes |
| baseline | `d5c4726f` | `model-host-d5c4726f-d5c1-4b29-a1ff-abf84bb65644` | 17.9 s | yes |

All four passed, between 10.7 and 17.9 seconds, well under 60. No candidate was tried, and the image is unchanged. This is the third proof ticket 09 waits on.
