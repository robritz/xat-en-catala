# ALIA as an alternative model

Terms in **bold** on first use are defined in the glossary at the repository root. Use them as defined there.

## Problem Statement

The chat has one **model**, Salamandra 7B, and everything around it assumes there is only one: the app's settings, the images, the pipelines and the cloud resources. BSC also publishes ALIA, a 40B model trained on the same languages, which may write better Catalan. The owner has no way to try it in the chat, and nothing in this repository records how it would run.

## Solution

ALIA runs on a **model host** of its own on Cloud Run, built and deployed from this repository by the same pattern as Salamandra's: a weights image built by hand, a service image built on merge, and a deploy that tries each new revision with one **message** before it takes traffic. The owner chooses which model serves every learner with one setting in the app. Salamandra stays the default until the owner chooses otherwise.

Whether ALIA is good enough to switch to is the owner's judgement and is not part of this work.

## User Stories

### Choosing the model

1. As the owner, I want to switch the chat between Salamandra and ALIA by changing one setting, so that I can try ALIA without a code change.
2. As the owner, I want to switch back by changing the same setting, so that falling back is as easy as trying.
3. As the owner, I want Salamandra to be the model when the setting is unset, so that nothing changes for learners until I choose.
4. As the owner, I want a misspelt model name to fail loudly at the first request, so that a typo never silently sends learners to the wrong model.
5. As the owner, I want only the chosen model's host address and key to be required, so that I can run the app with Salamandra alone while ALIA's host does not exist yet.
6. As the owner, I want a clear error naming the missing variable when the chosen model's address or key is not set, so that a misconfiguration is fixed in seconds.
7. As the owner, I want each model sent the sampling its makers advise, so that ALIA is not judged by settings tuned for Salamandra.
8. As the owner, I want Salamandra's sampling unchanged by this work, so that its replies stay as they were.
9. As the owner, I want the name each host serves its model under to be part of that model's settings, so that I never have to keep a third variable in step with the other two.

### Learning with either model

10. As a learner, I want the chat to behave the same whichever model is chosen, so that the choice is invisible to me apart from the **replies**.
11. As a learner, I want a **translation** to work with ALIA as it does with Salamandra, so that the toggle I rely on still works.
12. As a learner, I want my **learner profile** to shape ALIA's replies as it shapes Salamandra's, so that replies stay pitched at my **tier**.
13. As a learner, I want ALIA's replies cut before a sign-off as Salamandra's are, so that replies do not end with a signature.
14. As a learner, I want the wait at the start of a **session** with ALIA to look the same as with Salamandra, so that only its length differs.
15. As a learner, I want the chat to hold my first message through ALIA's longer **cold start**, so that it does not time out while the model wakes.

### Running ALIA's host

16. As the owner, I want ALIA's host to cost nothing while nobody is using it, so that trying ALIA stays cheap.
17. As the owner, I want ALIA's host capped at one GPU, so that a burst of traffic or a mistake cannot run up a bill on the costlier GPU.
18. As the owner, I want ALIA's host to refuse requests without its key, so that only the app can reach it.
19. As the owner, I want ALIA's host to have its own key, so that a leaked key reaches one host and not both.
20. As the owner, I want ALIA's weights pinned by revision and checksum, so that the host serves exactly the file I chose.
21. As the owner, I want ALIA's weights mirrored into the project once, so that no build depends on Hugging Face.
22. As the owner, I want ALIA's engine, weights and settings recorded in this repository, so that the host can be rebuilt from scratch.
23. As the owner, I want ALIA's host to run the same engine with the same flags as Salamandra's, so that differences between replies come from the models and not from the serving.
24. As the owner, I want Salamandra's host, names and URL left exactly as they are, so that the host that works is not disturbed.

### Deploying

25. As the owner, I want a merge that changes ALIA's image or service to deploy ALIA without my involvement, so that ALIA's running host always matches `main`.
26. As the owner, I want a merge that changes only Salamandra to leave ALIA alone, and the reverse, so that one model's change never rebuilds or redeploys the other.
27. As the owner, I want a new ALIA revision to take traffic only after it has produced a reply, so that a broken build never reaches a learner.
28. As the owner, I want ALIA's revisions held to a cold-start target of its own, so that ALIA can be deployed at all while Salamandra stays held to 60 seconds.
29. As the owner, I want ALIA's target set from a measured cold start, so that it reflects what the host does and not a guess.
30. As the owner, I want every ALIA deploy to record the cold start it measured, so that I can see the number move when I change the image.
31. As the owner, I want a routine ALIA deploy never to move its 43 GB of weights, so that deploys take minutes and not an hour.
32. As the owner, I want to go back to ALIA's previous revision with one command, as I can with Salamandra's.
33. As the owner, I want ALIA's Dockerfile linted on every pull request, so that mistakes are caught before merge without building anything.
34. As the owner, I want ALIA's cloud resources and triggers described in the same Terraform as Salamandra's, so that the setup stays readable and re-runnable.
35. As the owner, I want reorganising Salamandra's files for two models to rebuild and redeploy nothing of substance, so that the reorganisation is safe to merge.

## Implementation Decisions

### Weights and GPU

- The weights are BSC's own Q8_0 conversion of ALIA-40b-instruct-2601, `ALIA-40b-instruct-2601-Q8_0.gguf`, 42,969,797,856 bytes, from `BSC-LT/ALIA-40b-instruct-2601-GGUF` at revision `257ea58cdc8ff825634b36d1d2bfe052d4ac20f9`, with SHA-256 `fa2d8b15c9df7aaee96e31ddb8dece553bb6b826253bc067f98c9ccb61c9851f`. The repository's card says it is gated, but the file downloads without a token.
- The host runs on one NVIDIA RTX PRO 6000 (96 GB) in `europe-west4`, with that GPU's minimum of 20 CPUs and 80 GiB. ALIA does not fit the L4 at any quantisation above Q3. The reasons for Q8_0 on this GPU are in ADR 0003.
- The engine and its flags are Salamandra's: the same pinned llama.cpp server image, four replies at once with 8,192 tokens of context each, the chat template embedded in the weights file, and the samplers the app cannot set switched off. ALIA's context costs about 192 KiB per token, so all four slots take about 6.4 GB beside the weights.

### Names

- Salamandra's names do not change: the service `model-host`, its secret `model-host-api-key`, its revision names, its triggers and its Terraform state.
- ALIA's are the service `model-host-alia`, the secret `model-host-alia-api-key`, revisions named `model-host-alia-<build>`, and Terraform state of its own beside Salamandra's.
- Both hosts run as the existing service account for the model host, and both models' pipelines as the existing build and deploy accounts. The service account is granted read access to ALIA's secret too.

### Images

- Each model has its own directory holding its Dockerfile, its weights image build, its weights mirror script and its service image build. Salamandra's files move into such a directory unchanged, and ALIA's are written to the same pattern.
- The image tag is still the checksum of the model's Dockerfile, so moving Salamandra's changes neither its tag nor its image.
- ALIA's weights image holds only its weights file and is built by hand. ALIA's service image copies the weights into a layer of their own and reuses the previous image as a build cache, as Salamandra's does, so that routine builds keep the layer's digest and deploys move no weights.
- ALIA's builds run with a larger disk and a longer timeout than Cloud Build's defaults, since the 43 GB file and its image layer do not fit the default disk.

### The service and its pipelines

- The service configuration describes one model host and takes the model's settings as variables: the service name, GPU type, CPUs, memory, secret, request timeout and cold-start target. Each model is applied with its own variables and its own state.
- Scaling and access are Salamandra's for both: zero to one instance, four requests at once, zonal redundancy off, a startup probe on the server's health route, unauthenticated at the Cloud Run level with the API key as the gate.
- The build and deploy pipelines are shared configurations, run per model by that model's own triggers. Each model has a build trigger scoped to its directory and a deploy trigger scoped to its Dockerfile and the service configuration. The triggers pass the model's settings to the pipelines as substitutions.
- A change to the shared service configuration deploys both models, since it may change either.
- The deploy's test message takes the cold-start target from the model's settings instead of a fixed 60 seconds. Everything else about the deploy is unchanged: a revision with no traffic under a tag, one message, traffic moved by name on success, the previous revision kept on failure, and the cold start logged as one line of JSON.

### The cold start

- Each model has its own cold-start target. Salamandra's stays at 60 seconds.
- ALIA's target is set from a cold start measured on a first deploy by hand, plus a margin. If that measurement is far over what a learner would wait, roughly three minutes, the weights are revisited (Q6_K first) rather than the target raised.
- ALIA's request timeout is raised to hold a request through its cold start. The chat route's time limit is a single value for both models, so it follows the slower one.

### The app

- One setting, `MODEL`, set to `salamandra` or `alia`, chooses the model for every learner. Unset, it is `salamandra`. Any other value is an error at the first request.
- Each model has its own host address and key: `SALAMANDRA_HOST_URL`, `SALAMANDRA_HOST_API_KEY`, `ALIA_HOST_URL` and `ALIA_HOST_API_KEY`. They replace `MODEL_HOST_URL` and `MODEL_HOST_API_KEY`. Only the chosen model's two are required, and the error for a missing one names it.
- Each model's settings in the model module hold the name its host serves it under and the sampling sent with every request. `MODEL_NAME` is removed.
- Salamandra keeps a temperature of 1 and a top-p of 1. ALIA gets a temperature of 0.1, within the 0 to 0.2 BSC advises, and a top-p of 1. Neither gets a repetition penalty.
- The model module's interface to the chat route is unchanged: the route asks for the chat model and gets whichever is chosen. The prompts, the translation prompt and the stop sequences stay shared by both models.

### Order of work

1. The app's setting, and the per-model layout with Salamandra moved into it. Neither depends on the other, and neither changes what learners see.
2. ALIA's cloud resources, the mirrored weights and the weights image. The owner requests GPU quota first.
3. ALIA's host deployed by hand, and its cold start measured.
4. ALIA's triggers and per-model targets, with ALIA's target, its request timeout and the chat route's time limit set from that measurement.
5. The app pointed at ALIA, to see a reply, a translation and a sign-off cut work end to end.

## Testing Decisions

- A good test here checks what crosses a boundary — the request the app sends to a model host, the resources a Terraform plan would make, the reply a revision streams — and not how the code is arranged inside.
- **The app** is tested through the model module's existing seam: set the environment, ask for the chat model, make a request, and check the HTTP request that reaches the model host. The tests cover Salamandra when `MODEL` is unset; each model's address, key, served name, temperature and top-p when chosen; the error for an unknown value; and the error naming a missing address or key. Prior art: the model module's existing tests, which already check the key, the served name, token counting and the sampling this way. The chat route's tests mock the chat model and do not change.
- **The infrastructure** is tested through the existing Terraform plan tests. The platform tests cover both models' triggers, their files and their scoping, and ALIA's secret and grant. The service tests cover a plan with each model's variables: the GPU, CPUs, memory, secret and timeout. Salamandra's existing assertions stay as they are. Prior art: the existing platform and service test files.
- **The images** are tested by the deploy's test message, as Salamandra's is. Its timing logic already takes the target as a parameter and has unit tests. No separate suite is written for the Dockerfiles or the mirror script.
- Moving Salamandra's files is tested by its merge: the build finds the image already pushed, and the deploy tries a revision of the same image, which passes.

## Out of Scope

- Judging ALIA's replies against Salamandra's, recording comparisons, or setting criteria for switching. The owner decides when to switch.
- Choosing the model per learner or per session, or showing the choice in the UI.
- Separate prompts, translation prompts or stop sequences for ALIA.
- Renaming Salamandra's service, secret, revisions, triggers or state.
- More than one instance of either host, or an always-on instance.
- Tuning ALIA's image for a faster cold start beyond what the target requires.
- Converting the weights ourselves.

## Further Notes

- Where the app itself is hosted is not recorded in this repository. If that platform caps a route's time limit, the cap is the ceiling for ALIA's cold-start target, and is checked before the target is set.
- The RTX PRO 6000 needs quota in `europe-west4`, which the owner requests by hand before the first deploy. During a deploy, a new revision and the old one each hold a GPU for a moment, so the quota has to allow two.
- Salamandra's image starts in 10 to 20 seconds from 6.4 GB, almost all of it loading the weights. Nobody has yet seen how Cloud Run fetches and loads a 43 GB image, so the first measurement may change the plan.
- An idle RTX PRO 6000 instance, which Cloud Run keeps for a while after the last request, costs several times what an idle L4 does.
