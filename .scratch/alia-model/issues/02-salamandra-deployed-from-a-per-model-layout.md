# 02 — Salamandra deployed from a per-model layout

**What to build:** The prefactor that makes a second model a matter of a second set of settings. Salamandra's image files move into a directory of their own, unchanged. The service configuration, the build and deploy pipelines, and the triggers take the model's settings instead of assuming Salamandra. Salamandra's **model host** goes on running exactly as before: same service, same names, same state, same image, and a **cold start** target of 60 seconds that now comes from its settings.

See `docs/specs/alia-model.md`, sections "Names", "Images" and "The service and its pipelines".

**Needs the owner:** The platform configuration is applied by hand. Show the owner the plan, which should only change the triggers, and wait for a go before applying.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Salamandra's Dockerfile, weights build, mirror script and service image build are in a directory of Salamandra's own, with the Dockerfile's contents unchanged, so its image tag is unchanged.
- [ ] The image tag script and the deploy's scripts are shared and take the model's directory or settings as arguments.
- [ ] The service configuration takes the service name, GPU type, CPUs, memory, secret, request timeout and cold-start target as variables. Applied with Salamandra's, its plan against the live service shows no change.
- [ ] Salamandra's Terraform state stays where it is. Each model's state is chosen at init.
- [ ] The build and deploy pipelines take the model's settings as substitutions. The deploy's test message holds a revision to the target it is given, and Salamandra's triggers give 60 seconds.
- [ ] Salamandra's build trigger is scoped to its directory, and its deploy trigger to its Dockerfile and the service configuration. The platform plan changes the triggers and nothing else.
- [ ] The pull-request lint reads Salamandra's Dockerfile at its new place.
- [ ] The platform and service Terraform tests pass with the new scoping and variables.
- [ ] The merge of this ticket finds Salamandra's image already pushed and builds nothing, and its deploy tries a revision of the same image, which passes and takes traffic.
- [ ] The guide's account of the layout, the pipelines and the by-hand commands matches.
