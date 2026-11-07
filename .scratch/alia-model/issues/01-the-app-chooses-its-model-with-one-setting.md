# 01 — The app chooses its model with one setting

**What to build:** The owner chooses which **model** serves every learner with one setting, `MODEL`, set to `salamandra` or `alia`. Unset, it is Salamandra, and the chat behaves exactly as it does today. Each model has its own host address and key, and the name its host serves it under and the sampling sent with every request are part of that model's settings in the code. ALIA's **model host** does not exist yet, so this ticket is seen working against Salamandra's.

See `docs/specs/alia-model.md`, section "The app", and the testing decisions for the app.

**Needs the owner:** The variables are renamed wherever the app is hosted. Tell the owner the old and new names and wait for them to confirm before the change is merged, or the live chat loses its host.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `MODEL` chooses the model: `salamandra`, `alia`, or unset for Salamandra. Any other value is an error at the first request that names the value and the allowed ones.
- [ ] `SALAMANDRA_HOST_URL`, `SALAMANDRA_HOST_API_KEY`, `ALIA_HOST_URL` and `ALIA_HOST_API_KEY` replace `MODEL_HOST_URL` and `MODEL_HOST_API_KEY`. Only the chosen model's two are required, and the error for a missing one names it.
- [ ] `MODEL_NAME` is removed. Salamandra is requested as `BSC-LT/salamandra-7b-instruct-2606`, as today, and ALIA under the name its host will serve it as.
- [ ] Salamandra is sent a temperature of 1 and a top-p of 1, as today. ALIA is sent a temperature of 0.1 and a top-p of 1. Neither is sent a repetition penalty.
- [ ] The chat route's use of the model module is unchanged, and so are the prompts, the translation prompt and the stop sequences.
- [ ] The model module's tests, through the request that reaches the model host, cover: Salamandra when unset; each model's address, key, served name, temperature and top-p when chosen; the unknown-value error; and the missing-variable error.
- [ ] The example environment file and the guide describe the setting and the four variables.
- [ ] With `MODEL` unset and Salamandra's variables set, a reply streams from Salamandra's live host in Catalan with its token counts.
