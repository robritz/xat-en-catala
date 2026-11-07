# 02 — Salamandra deployed from a per-model layout

**What to build:** The prefactor that makes a second model a matter of a second set of settings. Salamandra's image files move into a directory of their own, unchanged. The service configuration, the build and deploy pipelines, and the triggers take the model's settings instead of assuming Salamandra. Salamandra's **model host** goes on running exactly as before: same service, same names, same state, same image, and a **cold start** target of 60 seconds that now comes from its settings.

See `docs/specs/alia-model.md`, sections "Names", "Images" and "The service and its pipelines".

**Needs the owner:** The platform configuration is applied by hand. Show the owner the plan, which should only change the triggers, and wait for a go before applying.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Salamandra's Dockerfile, weights build, mirror script and service image build are in a directory of Salamandra's own, with the Dockerfile's contents unchanged, so its image tag is unchanged.
- [x] The image tag script and the deploy's scripts are shared and take the model's directory or settings as arguments.
- [x] The service configuration takes the service name, GPU type, CPUs, memory, secret, request timeout and cold-start target as variables. Applied with Salamandra's, its plan against the live service shows no change.
- [x] Salamandra's Terraform state stays where it is. Each model's state is chosen at init.
- [x] The build and deploy pipelines take the model's settings as substitutions. The deploy's test message holds a revision to the target it is given, and Salamandra's triggers give 60 seconds.
- [x] Salamandra's build trigger is scoped to its directory, and its deploy trigger to its Dockerfile and the service configuration. The platform plan changes the triggers and nothing else.
- [x] The pull-request lint reads Salamandra's Dockerfile at its new place.
- [x] The platform and service Terraform tests pass with the new scoping and variables.
- [x] The merge of this ticket finds Salamandra's image already pushed and builds nothing, and its deploy tries a revision of the same image, which passes and takes traffic.
- [x] The guide's account of the layout, the pipelines and the by-hand commands matches.

## Outcome

Merged in #57 (`6d1ddef`) on 2026-11-07, after the owner applied `infra/platform` immediately before the merge.

- The build found `service:c8aa93c0bb1d` already pushed and built nothing. The deploy tried revision `model-host-9cd42ad5-36d9-4365-bc58-9254b5a8d7f8`, logged a cold start of 9.7 seconds, and sent it all traffic.
- Before the merge, against the live project, Salamandra's service planned no change and the platform updated its two triggers in place.

It differs from the criteria above in three ways, settled in review:

- Each model's state is a Terraform workspace under the prefix `service`, not a prefix of its own. Salamandra's is the default workspace, which is the state it already had, so a plain `init` reaches a real state. The service refuses to plan a model outside its own workspace.
- Each model's service settings live in the service's Terraform, chosen by `model`, not passed in as variables, so the tests check Salamandra's real values. The cold-start target is in infra/platform's `models` and reaches the deploy as a substitution.
- The service image build pipeline stays shared by the models, as the spec has it, and is not in the model's directory.

Salamandra's Dockerfile still names the weights build and mirror script at their old places under `model/`, so that its tag did not change. They are corrected the next time the Dockerfile changes.
