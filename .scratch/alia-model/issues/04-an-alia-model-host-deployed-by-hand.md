# 04 — An ALIA model host, deployed by hand

**What to build:** ALIA answering from Cloud Run. A service image puts ALIA's weights on top of the same llama.cpp server as Salamandra's, with the same flags, and one apply of the service configuration with ALIA's settings by hand produces `model-host-alia` on an RTX PRO 6000. It streams a **reply** to a request with its key, refuses one without, and costs nothing when idle. Its first real **cold start** is measured, which sets ALIA's target in ticket 05 and may send the choice of weights back for review.

See `docs/specs/alia-model.md`, sections "Weights and GPU", "Images", "The service and its pipelines" and "The cold start", and `docs/adr/0003-alia-q8-on-rtx-pro-6000.md`.

**Needs the owner:** The first apply starts an RTX PRO 6000 instance. Ask before applying.

**Blocked by:** 03 — ALIA's cloud resources and weights image.

**Status:** ready-for-agent

- [ ] ALIA's Dockerfile starts from the same pinned engine image as Salamandra's, copies the weights from ALIA's weights image into a layer of their own, runs as an unprivileged user, and passes Salamandra's flags with ALIA's weights file and served name.
- [ ] The served name is the one ticket 01 requests ALIA under.
- [ ] The pull-request lint covers ALIA's Dockerfile.
- [ ] ALIA's service image build reuses the previous image as a cache, with a disk and timeout large enough for its weights, so that a build changing only a flag keeps the weights layer's digest.
- [ ] Applied with ALIA's settings and its own state, the service configuration makes `model-host-alia`: one RTX PRO 6000, 20 CPUs, 80 GiB, zero to one instance, four requests at once, zonal redundancy off, a startup probe on the health route that allows for ALIA's load time, and ALIA's key from its secret. Salamandra's service is untouched.
- [ ] The server logs four slots of 8,192 tokens, and the chat template embedded in the weights file.
- [ ] A streamed chat completion with the key comes back in Catalan and ends with its token counts. Without the key, or with a wrong one, it is refused.
- [ ] After the idle period the service shows no running instance.
- [ ] The cold start is measured at least three times from zero instances, and recorded in this ticket with how it splits between fetching the image, loading the weights and the reply starting, as far as the logs show.
- [ ] If the cold start is far over three minutes, that is reported to the owner, with the Q6_K fallback, before ticket 05 starts.
- [ ] The guide describes ALIA's image and how to deploy it by hand.
