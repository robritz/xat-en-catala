# 05 — A merge deploys ALIA

**What to build:** A merge to `main` that changes ALIA's image or the service configuration puts a new revision of ALIA's **model host** into service without anyone's involvement, and only if it works, exactly as Salamandra's pipeline does. ALIA's revisions are held to a **cold start** target of their own, set from ticket 04's measurement. ALIA's request timeout and the chat route's time limit are raised so that a learner's first **message** is held through that cold start.

See `docs/specs/alia-model.md`, sections "The service and its pipelines" and "The cold start".

**Needs the owner:**
- The platform apply adds triggers. Show the plan and wait for a go.
- Where the app is hosted is not recorded. Ask the owner, and check whether that platform caps a route's time limit before the target is set.

**Blocked by:** 04 — An ALIA model host, deployed by hand.

**Status:** ready-for-agent

- [ ] The platform configuration adds ALIA's build trigger, scoped to ALIA's directory, and its deploy trigger, scoped to ALIA's Dockerfile and the service configuration, running as the existing build and deploy accounts and passing ALIA's settings. Its tests cover both triggers and their scoping.
- [ ] ALIA's cold-start target is ticket 04's slowest measurement plus a margin, and no more than the app platform's cap on a route's time limit, if it has one.
- [ ] ALIA's request timeout holds a request through its target. The chat route's time limit follows the slower model, with a comment saying why.
- [ ] A merge that changes only ALIA's Dockerfile builds and deploys ALIA, and starts neither of Salamandra's pipelines. A merge that changes only Salamandra's starts neither of ALIA's.
- [ ] A routine ALIA build reuses the weights layer: its log shows the layer cached and the push reports it as existing.
- [ ] The deploy logs ALIA's cold start as one line of JSON naming the event, the revision and the seconds.
- [ ] The failure path has been seen: a revision that misses the target fails the build and the previous ALIA revision keeps serving.
- [ ] Going back to ALIA's previous revision is one documented command.
- [ ] The guide describes ALIA's pipelines, its target and where to read its cold start.
