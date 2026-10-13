# 04 — A model host on Cloud Run, deployed by hand

**What to build:** The model answering from Cloud Run. A service image puts the weights on top of llama.cpp's server, a deploy script holds the service's settings, and one run of that script by hand produces a **model host** that streams a **reply** to a request carrying the key, refuses one without it, and costs nothing when idle. The first real **cold start** is measured, which is the number the whole design rests on and which nobody has yet seen.

The first version is deliberately plain: default layer compression and the engine's default way of loading weights. Tuning is ticket 08.

See `docs/specs/model-host-cloud-run.md`, sections "Engine and weights", "Images" and "The service", and `docs/adr/0001-quantised-llama-cpp-on-cloud-run.md`.

**Needs the owner:** The first deploy starts a GPU instance. Ask before running it.

**Blocked by:** 03 — Cloud resources and the weights image.

**Status:** ready-for-agent

- [x] The service image starts from the official llama.cpp `server-cuda` image pinned by digest, and copies the weights from the weights image into a layer of their own, placed before anything that changes often.
- [ ] Rebuilding the service image after changing only a server flag leaves the weights layer's digest unchanged.
- [x] The server runs four replies at once with 8,192 tokens of context each, uses the chat template embedded in the weights file, and has the samplers the app cannot set switched off.
- [x] The server requires the API key, which reaches it from Secret Manager and appears in no image layer, script or log.
- [x] A deploy script holds every `gcloud run deploy` setting: `europe-west4`, one NVIDIA L4, 4 CPUs, 16 GiB of memory, instance-based billing, zero to one instance, four requests at once, zonal redundancy off, unauthenticated at the Cloud Run level, and a request timeout long enough to hold a request through a cold start. It takes the image to deploy as an argument and can be run by hand.
- [x] A startup probe on the server's health route keeps requests from an instance until the weights are loaded.
- [x] A chat completion request with the key gets a streamed reply in Catalan, and the stream ends with the token counts.
- [x] The same request without the key, or with a wrong one, is refused.
- [x] After the idle period the service shows no running instance.
- [x] The cold start is measured at least once from zero instances, from sending the request to the first word of the reply, and the number is recorded in the ticket along with how it splits between the instance becoming ready and the reply starting, as far as the logs show.
- [x] If the cold start is far over 60 seconds, that is reported to the owner before any further ticket is started.
- [x] The README describes the image and how to deploy it by hand.

## Outcome

The owner built the image and deployed it on 2026-10-13: image `service:5a35510`, revision `model-host-00001-2cz`, at `https://model-host-yke3nr54cq-ez.a.run.app`. Checked the same day.

### The cold start

**10.9 seconds**, measured once from zero instances with `model/time-reply.mjs`, from sending the request to the first word of the reply. The reply ended at 11.5 seconds, with its token counts.

How it splits, from the service's logs (UTC):

| Time | What happened | Seconds from the request |
| --- | --- | --- |
| 09:03:04.4 | The request arrives, and Cloud Run starts an instance for it | 0 |
| 09:03:07.3 | The server begins loading the weights | 2.9 |
| 09:03:14.1 | The weights are loaded and the server is listening | 9.6 |
| 09:03:15.0 | The startup probe succeeds, and the request reaches the server | 10.6 |
| 09:03:15.3 | The first word of the reply | 10.9 |

So about 10.6 seconds go to the instance becoming ready, of which 6.8 are loading the weights, and 0.3 to the reply starting. The first instance, at the deploy, took the same: 11 seconds from start to ready.

This is one measurement, taken a minute after the previous instance had shut down. A start after a longer idle may have to fetch the image afresh and take longer; that has not been seen. The spec asks for three measured cold starts before RunPod is retired.

It is well under 60 seconds, so there is nothing to report to the owner under the last criterion but the number itself, and ticket 08 may have nothing to do.

### The rest

- **Slots and context.** The server logged `n_slots = 4, n_ctx_slot = 8192`.
- **Samplers.** The server's own account of its defaults has top-k at 0 and min-p at 0, with repeat penalty, typical-p, XTC, DRY and top-n-sigma off.
- **Chat template.** The one embedded in the weights file, as the server reports it.
- **The key.** A request without the key, and one with a wrong key, got 401. `/health` answers without it. The server's startup log carries no trace of the key.
- **A reply.** A streamed chat completion with the key came back in Catalan and ended with its token counts.
- **Idle.** The instance shut down by itself at 09:01:57, ten minutes after its last request at 08:51:42.
- **The service's settings**, read back from Cloud Run: at most one instance, CPU always allocated, zonal redundancy off.

### The weights layer's digest

Checked on 2026-10-13 and **it failed**. Three builds of the image in Cloud Build gave the 6.35 GB weights layer three digests, one of them a rebuild with nothing changed:

| Image | Built (UTC) | Weights layer |
| --- | --- | --- |
| `service:5a35510` | 08:33 | `sha256:93d09ca371f2…` |
| untagged | 09:20 | `sha256:5280017e7033…` |
| `service:digest-check`, with `--metrics` added | 09:44 | `sha256:cc2d3eaa653b…` |

The thirteen layers of the engine image were the same in all three. The weights layer differs before compression too, so the builder in Cloud Build stamps something in it with the time of the build. Copying the directory whole, which kept the digest steady on a newer local Docker, does not on Cloud Build's.

**The fix, not yet verified:** `model/cloudbuild.yaml` now pushes each image as `service:latest` as well and gives it to the next build as a cache, so that the layer is taken from the image before and not made again. It needs two builds to show it: one to leave a cache behind, and one with a flag changed, whose weights layer should then carry the digest of the first. The box stays open until that is seen.
