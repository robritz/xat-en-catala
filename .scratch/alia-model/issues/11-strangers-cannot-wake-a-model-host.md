# 11 — Strangers cannot wake a model host

**What to build:** A request without the key does not start a GPU instance. A model host is open to anyone at the Cloud Run level, and its API key is checked only by the server once an instance is up.

In ticket 06, a `python-requests` client sent `GET /` to ALIA's public URL. Its 404 still started an RTX PRO 6000 instance, which stayed up for its idle period. While an instance is up, ALIA costs about $3.19 an hour and Salamandra about $1.05. Anyone who finds either URL can wake them as often as they like.

See ticket 06's outcome, "Seen on the way", and `docs/specs/alia-model.md`, "The service and its pipelines" ("unauthenticated at the Cloud Run level with the API key as the gate").

**Needs the owner:** This changes how the app reaches both model hosts. Options:
- Cloud Run IAM, with the app holding a service account's identity token.
- A gateway or proxy that checks the key before Cloud Run starts an instance.

Agree one before building it.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] A request to either model host without the key, or with a wrong one, starts no instance.
- [ ] The app's requests, and the deploy's test message, still reach the hosts and time a real cold start.
- [ ] The infrastructure tests cover the new access rule.
- [ ] The guide says how the app is given access, and what a new environment needs.
