# A model host on Cloud Run

Terms in **bold** on first use are defined in `CONTEXT.md` at the repository root. Use them as defined there.

## Problem Statement

The model runs on a RunPod serverless endpoint that scales to zero. The first **message** after idle time waits three to four minutes for a worker, so every **session** begins with a wait long enough that a learner may give up. Keeping a worker running removes the wait but bills a GPU around the clock, which a proof of concept cannot justify.

The endpoint is also configured by hand in RunPod's console. Nothing in this repository records which engine, weights or settings serve the model, and nothing deploys them.

## Solution

A second **model host** on Google Cloud Run, built and deployed from this repository, with a **cold start** of under 60 seconds while still scaling to zero.

The cold start is cut mainly by what is loaded, not by how it is packaged: a quantised copy of the model served by llama.cpp, which starts in seconds and reads less than half the bytes of the full-precision weights. The weights are baked into the container image in a layer of their own.

A merge to `main` that touches `model/` builds the image, deploys it as a revision that receives no traffic, sends it one test message, and promotes it only if a reply comes back within the target. The app stops knowing which host it talks to: switching hosts is a change of two environment variables. RunPod stays in place until Cloud Run has passed a fixed comparison, and is then retired by hand.

## User Stories

### Waking the model

1. As a learner, I want the model to be ready in under a minute after I start a session, so that I do not give up before the greeting arrives.
2. As a learner, I want the wait at the start of a session to look as it does today, so that nothing about starting changes except how long it takes.
3. As a learner, I want **replies** to read as well as they did before the move, so that a faster start has not cost me the quality of the Catalan.
4. As a learner, I want a **translation** to behave as it did before the move, so that the toggle I rely on still works.

### Running the host

5. As the owner, I want the model host to cost nothing while nobody is using it, so that the proof of concept stays cheap.
6. As the owner, I want spend capped at one GPU, so that a burst of traffic or a mistake cannot run up a bill.
7. As the owner, I want the model host to refuse requests that lack its key, so that only the app can reach the model.
8. As the owner, I want the engine, weights and settings recorded in this repository, so that the host can be rebuilt from scratch.
9. As the owner, I want to switch the app between hosts by changing environment variables alone, so that I can compare them and fall back without a code change.

### Deploying

10. As the owner, I want a merge that touches `model/` to deploy the model host without my involvement, so that the running host always matches `main`.
11. As the owner, I want a merge that does not touch `model/` to leave the model host alone, so that app changes never rebuild a multi-gigabyte image.
12. As the owner, I want a new revision to take traffic only after it has produced a reply, so that a broken build never reaches a learner.
13. As the owner, I want every deploy to record the cold start it measured, so that I can see the number move when I change the image.
14. As the owner, I want a deploy to fail when its cold start exceeds the target, so that a regression is caught at merge and not by a learner.
15. As the owner, I want a routine deploy never to move the weights, so that deploys take a minute or two and not ten.
16. As the owner, I want to go back to the previous revision with one command, so that a bad deploy is undone in seconds.
17. As the owner, I want a pull request that changes the Dockerfile to be linted, so that mistakes are caught before merge without building anything.
18. As the owner, I want the cloud resources the pipeline depends on created by a script I can read and re-run, so that the setup is not locked in a console.

### Retiring RunPod

19. As the owner, I want a fixed set of messages to compare the two hosts with, so that "as good as before" is something I checked and not something I assumed.
20. As the owner, I want RunPod left running until Cloud Run has passed that comparison, so that I can fall back at any point before then.

## Implementation Decisions

### Engine and weights

- The engine is llama.cpp's server, taken from its official `server-cuda` image pinned by digest. It serves the OpenAI-compatible API the app already speaks. The reasons for choosing it over vLLM are in `docs/adr/0001-quantised-llama-cpp-on-cloud-run.md`.
- The weights are the Q6_K quantisation of `BSC-LT/salamandra-7b-instruct-2606`, 6.38 GB, from `mradermacher/salamandra-7b-instruct-2606-GGUF`, pinned to revision `8bcd7d8d8545749ef73b3046f7cb5cd64d8c70c1` and verified by checksum. BSC publishes no GGUF of this release.
- The file is mirrored once into a Cloud Storage bucket in the project. Builds read it from there and never from Hugging Face.
- The chat template is the one embedded in the GGUF file.
- The context window is 8,192 tokens per reply. The server runs four replies at once, so its total context is 32,768 tokens.
- The server's own samplers that the app cannot set (top-k, min-p and the like) are switched off by server flags, so that sampling is governed by what the app sends.
- The server checks an API key on every request. The key is held in Secret Manager and given to the service as an environment variable.

### Images

- There are two images. A weights image holds only the weights file and is rebuilt only when the weights change. The service image starts from the engine image and copies the weights from the weights image.
- The weights sit in a layer of their own in the service image, before anything that changes often, so that its digest is the same from one revision to the next.
- The first version is plain: default layer compression and the engine's default way of loading weights. Variants are tried afterwards, one per deploy, and kept only if the cold start the pipeline logs improves. The candidates are an uncompressed weights layer, loading the weights fully into memory against memory-mapping them, and moving the weights to Cloud Storage. If the plain version meets the target, none is tried.

### The service

- The service runs in `europe-west4` in the existing project, with one NVIDIA L4, 4 CPUs and 16 GiB of memory, and instance-based billing.
- It scales between zero and one instance, with at most four requests at once on the instance. Zonal redundancy is off.
- A startup probe on the server's health route keeps requests away from an instance until the weights are loaded.
- The service accepts unauthenticated requests at the Cloud Run level. The API key is the gate.
- The request timeout is long enough to hold a request open through a cold start, as the app's chat route already does.

### The pipeline

- The pipeline is a Cloud Build trigger on this repository for pushes to `main`, filtered to `model/**`, running `model/cloudbuild.yaml` as a dedicated service account. It is not the default compute service account.
- The steps are: build the service image, tagged with the commit SHA; deploy it as a revision with no traffic, under a tag; send that revision one message and time the reply; send traffic to it if a reply came back within 60 seconds; otherwise fail and leave the previous revision serving.
- The measured cold start is written to the build log as one line of JSON.
- The `gcloud run deploy` flags live in `model/deploy.sh`, which the pipeline calls and which can be run by hand.
- Going back is a traffic switch to the previous revision. Nothing is rebuilt.
- A second trigger lints the Dockerfile on pull requests that touch `model/`. It builds nothing.
- The weights image is built by hand, by a separate build configuration, when the weights change.

### Provisioning

- `model/bootstrap.sh` creates what the pipeline needs: the Artifact Registry repository, the bucket and the mirrored weights file, the pipeline's and the service's service accounts with their roles, the API key secret, and the triggers. It is safe to run again.
- Connecting this repository to Cloud Build is done by hand in the browser, once, before the script creates the triggers. The connection is through Developer Connect and its GitHub app, as the project's other service is, which posts each build's result to the commit as a check.

### The app

- `src/lib/runpod.ts` becomes `src/lib/model-host.ts`, and nothing in it is specific to a host.
- `RUNPOD_API_KEY`, `RUNPOD_ENDPOINT_ID` and `RUNPOD_MODEL` are replaced by `MODEL_HOST_URL`, the base URL of the host's OpenAI-compatible API; `MODEL_HOST_API_KEY`; and `MODEL_NAME`, which is optional.
- The app sets temperature and top-p on every request. The values are meant to be the ones RunPod applies today, so that replies stay comparable while both hosts exist. The model's `generation_config.json` names none, so the vLLM worker uses its own defaults, expected to be a temperature of 1 and a top-p of 1. This is confirmed against the running endpoint before the values are fixed.
- The session start, the wait message and the chat route's time limit are unchanged.

### Order of work

1. The app: the rename, the new variables and the explicit sampling. RunPod keeps serving.
2. The images and the bootstrap script, with a first deploy by hand.
3. The pipeline.

### Retiring RunPod

- Cloud Run is proven when all three hold: about ten fixed messages, covering chat, translation and a reply that would end in a sign-off, read as well on Cloud Run as on RunPod, as judged by the owner; token counts arrive with streamed replies; and three measured cold starts are under 60 seconds.
- The app's variables are then pointed at Cloud Run and the RunPod endpoint is deleted by hand.

### Documentation

- The README's account of the model, the cold start, the environment variables and the project layout is updated with the first pull request that changes each.
- The RunPod commands in `CLAUDE.md` are removed when RunPod is retired.

## Testing Decisions

- The app's existing tests for the model module move with the rename and cover the new variables, including the error when a required one is missing, and that temperature and top-p are sent.
- The pipeline's test message is the test of the image. No separate test suite is written for the Dockerfile or the scripts.
- The comparison messages are kept in the repository as a plain file, so the same set is used each time. The judgement is made by reading, not by a script.

## Out of Scope

- Moving the Next.js app to Cloud Run.
- Moving or changing the Matxa-TTS API.
- An always-on instance, or more than one instance.
- A larger GPU than the L4.
- Converting the weights to GGUF ourselves.
- Terraform, or any other tool for describing the cloud resources.
- Automating the comparison of replies between hosts.
- Showing the cold start, or a progress estimate, to the learner.

## Further Notes

- Google's documentation puts a GPU instance with drivers at about five seconds to start, so the cold start is almost entirely fetching the image and loading the weights. That is why the image variants are worth measuring.
- Cloud Run decides how long an idle instance is kept before it is shut down, and it is billed while it waits. How often a learner meets a cold start therefore depends on Cloud Run, not on a setting here.
- The project's default allowance is three L4 GPUs, so one instance needs no quota request. With one instance allowed, a new revision and the old one hold a GPU each for a moment during a deploy, which the allowance covers.
- `SIGN_OFFS` holds three stop sequences because the RunPod worker returns an empty stream with more than four. llama.cpp has not been tried with them; the comparison messages include a sign-off case for that reason.
