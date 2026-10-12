# 04 — A model host on Cloud Run, deployed by hand

**What to build:** The model answering from Cloud Run. A service image puts the weights on top of llama.cpp's server, a deploy script holds the service's settings, and one run of that script by hand produces a **model host** that streams a **reply** to a request carrying the key, refuses one without it, and costs nothing when idle. The first real **cold start** is measured, which is the number the whole design rests on and which nobody has yet seen.

The first version is deliberately plain: default layer compression and the engine's default way of loading weights. Tuning is ticket 08.

See `docs/specs/model-host-cloud-run.md`, sections "Engine and weights", "Images" and "The service", and `docs/adr/0001-quantised-llama-cpp-on-cloud-run.md`.

**Needs the owner:** The first deploy starts a GPU instance. Ask before running it.

**Blocked by:** 03 — Cloud resources and the weights image.

**Status:** ready-for-agent

- [ ] The service image starts from the official llama.cpp `server-cuda` image pinned by digest, and copies the weights from the weights image into a layer of their own, placed before anything that changes often.
- [ ] Rebuilding the service image after changing only a server flag leaves the weights layer's digest unchanged.
- [ ] The server runs four replies at once with 8,192 tokens of context each, uses the chat template embedded in the weights file, and has the samplers the app cannot set switched off.
- [ ] The server requires the API key, which reaches it from Secret Manager and appears in no image layer, script or log.
- [ ] A deploy script holds every `gcloud run deploy` setting: `europe-west4`, one NVIDIA L4, 4 CPUs, 16 GiB of memory, instance-based billing, zero to one instance, four requests at once, zonal redundancy off, unauthenticated at the Cloud Run level, and a request timeout long enough to hold a request through a cold start. It takes the image to deploy as an argument and can be run by hand.
- [ ] A startup probe on the server's health route keeps requests from an instance until the weights are loaded.
- [ ] A chat completion request with the key gets a streamed reply in Catalan, and the stream ends with the token counts.
- [ ] The same request without the key, or with a wrong one, is refused.
- [ ] After the idle period the service shows no running instance.
- [ ] The cold start is measured at least once from zero instances, from sending the request to the first word of the reply, and the number is recorded in the ticket along with how it splits between the instance becoming ready and the reply starting, as far as the logs show.
- [ ] If the cold start is far over 60 seconds, that is reported to the owner before any further ticket is started.
- [ ] The README describes the image and how to deploy it by hand.
