# 06 — A merge deploys the model host

**What to build:** A merge to `main` that touches the model directory puts a new revision of the **model host** into service without anyone's involvement, and only if it works. The pipeline builds the service image, deploys it as a revision that receives no traffic, sends that revision one test **message**, times the **reply**, and sends traffic to it only if a reply came back within 60 seconds. Otherwise the build fails and the previous revision keeps serving.

The test message doubles as a measurement: every deploy logs the **cold start** it saw, so the number can be watched as the image changes.

The pipeline is a Cloud Build trigger on this repository running a checked-in build configuration, matching how the project's other service deploys. The trigger is created by the bootstrap script from ticket 03.

See `docs/specs/model-host-cloud-run.md`, section "The pipeline".

**Needs the owner:** Giving the Cloud Build GitHub app access to this repository is done once in the browser, before the trigger can be created. Tell the owner exactly where to click and wait for them.

**Blocked by:** 04 — A model host on Cloud Run, deployed by hand.

**Status:** ready-for-agent

- [ ] The bootstrap script creates a trigger for pushes to `main` that change anything under the model directory, running as the pipeline's own service account. Running the script again does not create a second trigger.
- [ ] A merge that touches the model directory starts a build. A merge that does not starts none.
- [ ] The build tags the service image with the commit SHA and reuses the weights layer: the build log shows the weights are not fetched or pushed again.
- [ ] The new revision is deployed with no traffic, through the same deploy script that ticket 04 runs by hand.
- [ ] The build sends the untrafficked revision one message with the key and waits for the first word of the reply. The key is read from Secret Manager and is not written to the log.
- [ ] The measured cold start is written to the build log as one line of JSON that names the event, the revision and the seconds.
- [ ] A reply within 60 seconds sends all traffic to the new revision. No reply, an error, or a reply after 60 seconds fails the build and leaves traffic where it was.
- [ ] The failure path has been seen to work: a deliberately broken revision fails the build and the previous revision still answers.
- [ ] The result of the build shows as a check on the commit in GitHub.
- [ ] Going back to the previous revision is one documented command, and it has been run once to confirm it.
- [ ] The README describes what a merge does, where to read the cold start, and how to go back.

## Progress

Written on 2026-10-14 and not yet run against the cloud: the bootstrap script now creates a Developer Connect connection to GitHub in `europe-west4`, a link to this repository and the trigger `model-host-deploy`, and gives the pipeline's account the key and a read token for the repository. `model/cloudbuild.yaml` builds, pushes, deploys with `model/deploy.sh --candidate`, tries the revision with `model/try-revision.mjs`, and promotes it. The Developer Connect app is the one the TTS service already deploys through, and its commits carry a check from it.

Every box is open until the owner has approved the connection, run the script twice, merged a change to `model/`, tried a broken revision and gone back once.
