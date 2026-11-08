# 05 — A merge deploys ALIA

**What to build:** A merge to `main` that changes ALIA's image or the service configuration puts a new revision of ALIA's **model host** into service without anyone's involvement, and only if it works, exactly as Salamandra's pipeline does. ALIA's revisions are held to a **cold start** target of their own, set from ticket 04's measurement. ALIA's request timeout and the chat route's time limit are raised so that a learner's first **message** is held through that cold start.

See `docs/specs/alia-model.md`, sections "The service and its pipelines" and "The cold start".

**Needs the owner:**
- The platform apply adds triggers. Show the plan and wait for a go.
- Where the app is hosted is not recorded. Ask the owner, and check whether that platform caps a route's time limit before the target is set.

**Blocked by:** 04 — An ALIA model host, deployed by hand.

**Status:** done

- [x] The platform configuration adds ALIA's build trigger, scoped to ALIA's directory, and its deploy trigger, scoped to ALIA's Dockerfile and the service configuration, running as the existing build and deploy accounts and passing ALIA's settings. Its tests cover both triggers and their scoping.
- [x] ALIA's cold-start target is ticket 04's slowest measurement plus a margin, and no more than the app platform's cap on a route's time limit, if it has one.
- [x] ALIA's request timeout holds a request through its target. The chat route's time limit follows the slower model, with a comment saying why.
- [x] A merge that changes only ALIA's Dockerfile builds and deploys ALIA, and starts neither of Salamandra's pipelines. A merge that changes only Salamandra's starts neither of ALIA's.
- [x] A routine ALIA build reuses the weights layer: its log shows the layer cached and the push reports it as existing.
- [x] The deploy logs ALIA's cold start as one line of JSON naming the event, the revision and the seconds.
- [x] The failure path has been seen: a revision that misses the target fails the build and the previous ALIA revision keeps serving.
- [x] Going back to ALIA's previous revision is one documented command.
- [x] The guide describes ALIA's pipelines, its target and where to read its cold start.

## Outcome

Done on 2026-11-08 in #65 and #66, with the owner applying infra/platform immediately before #65 merged.

- **The numbers.** ALIA's target is 90 seconds, about three times its slowest cold start in ticket 04 (30.5 seconds), as Salamandra's 60 is to its 20. Its request timeout and the chat route's `maxDuration` are 180 seconds. The app is on Vercel with Fluid compute, which caps a route at 300 seconds on every plan. Salamandra's request timeout stays 120 seconds.
- **#65's merge** changed only `infra/service/` and the platform. It started both models' deploys and no builds.
  - Salamandra's revision logged a 12.2-second cold start.
  - ALIA's revision, `model-host-alia-e62b162b-…`, logged 33.7 seconds and took all traffic.
  - ALIA's apply took 25 seconds. Cloud Run did not import its image again.
- **#66** changed only a comment in ALIA's Dockerfile. It started only `model-host-alia-build` and `model-host-alia-deploy`.
  - The build log shows `COPY --from=weights /models /models` as `CACHED`, and every layer pushed as `Layer already exists`.
  - The new tag `138f1f284eea` has the same digest as the image before it, `sha256:b66c58b0…`. A comment changes nothing the image holds.
  - The build took 16 minutes, most of it pulling the cache image. The deploy took 19 minutes, including its wait for the build.
  - The revision `model-host-alia-c92b7bbc-…` logged 40.4 seconds and took all traffic.
- **The failure path,** run by hand with `_TARGET_SECONDS=1`.
  - It logged `{"event":"cold_start","revision":"model-host-alia-94fc36f2-…","seconds":null,"passed":false,"failure":"No reply within 1 seconds."}`.
  - The build failed.
  - `model-host-alia-e62b162b-…` kept all traffic. The failed revision is reachable only under the tag `candidate`.

It differs from the criteria above in two ways:

- **The deploy reads ALIA's key.** The review found that the deploy account could not read ALIA's key, which would have failed every ALIA deploy before any step ran. infra/platform now grants it.
- **The deploy asks for the right model.** Its message asks for the model by the `--alias` in the model's Dockerfile, through `infra/service/scripts/served-name.js`. Before, it always asked for Salamandra.

Three other changes came up on the way:

- **A deploy by hand had never worked.** The guide staged its source in the weights bucket, which the deploy account cannot read. It now stages it in the state bucket.
- **ALIA's cold starts on a revision's first instance** have ranged from 30.5 to 40.4 seconds. That is within the 90-second target, but slower than later instances (about 18 seconds).
- **Going back to an earlier revision** is a workspace switch and an apply, as it is for Salamandra.
