# 03 — ALIA's cloud resources and weights image

**What to build:** Everything ALIA's **model host** is assembled from, short of the host itself. ALIA's key secret exists and the host's service account can read it. ALIA's weights are mirrored once into the weights bucket, checked against their checksum, and a weights image holding them and nothing else is in the registry.

The weights are BSC's Q8_0 conversion, `ALIA-40b-instruct-2601-Q8_0.gguf`, 42,969,797,856 bytes, from `BSC-LT/ALIA-40b-instruct-2601-GGUF` at revision `257ea58cdc8ff825634b36d1d2bfe052d4ac20f9`, SHA-256 `fa2d8b15c9df7aaee96e31ddb8dece553bb6b826253bc067f98c9ccb61c9851f`. They download without a token.

See `docs/specs/alia-model.md`, sections "Weights and GPU", "Names" and "Images", and `docs/adr/0003-alia-q8-on-rtx-pro-6000.md`.

**Needs the owner:**
- RTX PRO 6000 quota in `europe-west4`, enough for two GPUs, is requested by hand in the console. Tell the owner where, and confirm it is granted before ticket 04.
- The platform apply creates billable resources. Show the plan and wait for a go.
- The key is added to the secret with gcloud, the mirror is run and the weights image is built by the owner, or with their go for each.

**Blocked by:** 02 — Salamandra deployed from a per-model layout.

**Status:** ready-for-agent

- [ ] The platform configuration creates the secret `model-host-alia-api-key` and grants the existing model host service account read access to it, and to nothing else new. Its tests cover both.
- [ ] A freshly generated key is added to the secret without being printed, committed or logged.
- [ ] ALIA's mirror script, in ALIA's directory, fetches the file at the pinned revision, checks its SHA-256, and stores it in the weights bucket only if it matches. Run again, it finds the file and exits cleanly.
- [ ] ALIA's weights image build reads the file from the bucket, with a disk and timeout large enough for 43 GB, and pushes an image holding only that file, tagged with the quantisation and revision.
- [ ] The file in the bucket has the size Hugging Face records, and the weights image is in the registry.
- [ ] The quota for two RTX PRO 6000 GPUs in `europe-west4` is granted.
- [ ] The guide describes ALIA's secret, mirror and weights build alongside Salamandra's.
