# 01 — The app talks to a model host, not to RunPod

**What to build:** The app stops knowing which **model host** it talks to. Today the module that builds the model client assembles a RunPod URL from an endpoint id, and its name, its variables and its comments all say RunPod. After this ticket it is given the base URL of a host's OpenAI-compatible API and a key, and nothing in it is specific to one host. Pointing the app at another host is then a change of environment variables alone.

This is a prefactor for the Cloud Run model host (see `docs/specs/model-host-cloud-run.md`, section "The app"). Nothing changes for a learner: a session still starts against RunPod, which is now addressed by its full URL.

Terms are defined in `CONTEXT.md`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] The module that builds the model client is renamed for the model host, and every import follows.
- [x] `MODEL_HOST_URL` and `MODEL_HOST_API_KEY` are required, and `MODEL_NAME` is optional with the model's Hugging Face id as its default. The three `RUNPOD_*` variables are no longer read anywhere.
- [x] A missing required variable still fails with an error that names the variables to set.
- [x] No name, comment or provider label in the app's source refers to RunPod, except where a comment records a behaviour seen on RunPod's worker, such as the limit on stop sequences.
- [x] With `MODEL_HOST_URL` set to the RunPod endpoint's OpenAI-compatible base URL, a session starts, a reply streams, and token counts still arrive with it.
- [x] The module's existing tests move with the rename and cover the new variables.
- [x] `.env.example` and the README's variable table, diagram and project layout describe the new variables. The README still says the model is hosted on RunPod, because it is.
- [x] The owner is told which values to put in their local environment file and in the hosted app's settings, since neither is in the repository.
- [x] `npm test` and `npm run lint` pass.
