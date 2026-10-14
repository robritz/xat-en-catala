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
- [x] The build tags the service image with the commit SHA and reuses the weights layer: the build log shows the weights are not fetched or pushed again.
- [x] The new revision is deployed with no traffic, through the same deploy script that ticket 04 runs by hand.
- [x] The build sends the untrafficked revision one message with the key and waits for the first word of the reply. The key is read from Secret Manager and is not written to the log.
- [x] The measured cold start is written to the build log as one line of JSON that names the event, the revision and the seconds.
- [x] A reply within 60 seconds sends all traffic to the new revision. No reply, an error, or a reply after 60 seconds fails the build and leaves traffic where it was.
- [x] The failure path has been seen to work: a deliberately broken revision fails the build and the previous revision still answers.
- [x] The result of the build shows as a check on the commit in GitHub.
- [ ] Going back to the previous revision is one documented command, and it has been run once to confirm it.
- [x] The README describes what a merge does, where to read the cold start, and how to go back.

## Outcome

The owner approved the connection, ran the bootstrap script, and merged pull request #28 on 2026-10-14. Checked the same day.

### The first deploy

The merge, `97c8230`, started build `938fbcaf` through the trigger `model-host-deploy`. It passed in 6 minutes 55 seconds and sent all traffic to `model-host-00002-soc`. Its log carries:

```
{"event":"cold_start","revision":"model-host-00002-soc","seconds":13,"passed":true}
```

- **The image** was pushed as `service:97c8230` and `service:latest`.
- **The weights** were not fetched from the bucket, and the push found every layer, the weights among them, already in the registry. The weights layer kept its digest, `sha256:ca0a4ce7d08b…`. The build did pull that layer from `service:latest`, its cache, which took 81 seconds, as in ticket 04.
- **The deploy step** took 2 minutes 48 seconds, nearly all of it Cloud Run creating the revision. No instance was started for it, so this is not part of the cold start.
- **The check** `model-host-deploy (project-45649980-817a-462c-b12)` shows on the commit in GitHub, from the Developer Connect app, as a success.
- **The key** reaches the test step through `secretEnv` and is printed nowhere.

### The failure path

The pipeline was run by hand as build `fe3e96b9`, under the tag `broken-test`, with an unknown flag, `--no-such-flag`, added to the server's flags. The image built and deployed as `model-host-00004-fay` with no traffic. The test message got a 503, and the build failed at that step:

```
{"event":"cold_start","revision":"model-host-00004-fay","seconds":null,"passed":false,"failure":"The model host answered 503."}
```

Traffic stayed with `model-host-00002-soc`, and a message to the service afterwards got a reply in Catalan, after a cold start of 13.6 seconds. The broken revision is still listed as ready, because no instance is started at deploy, and it still holds the tag `candidate` until the next deploy moves it. It also pushed `service:latest`, which the next build reads only as a cache. There is no revision `00003`.

### Still open

- **A second run of the script** has not been checked for a second trigger.
- **A merge that leaves `model/` alone** has not yet been seen to start no build.
- **Going back** has not been run. The command is in the README.
