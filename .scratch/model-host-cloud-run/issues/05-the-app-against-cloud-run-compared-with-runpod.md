# 05 — The app against Cloud Run, compared with RunPod

**What to build:** The chat working end to end against the Cloud Run **model host**, and a recorded answer to whether its **replies** are as good as RunPod's. With the app's local variables pointed at Cloud Run, a learner can start a **session**, chat, and translate exactly as before. The comparison **messages** are replayed against Cloud Run and set beside the RunPod baseline for the owner to read.

This is where behaviours that have only ever run against RunPod's worker are tried on llama.cpp for the first time: the stop sequences that cut a sign-off, the token counts on a streamed reply, and the chat template. Anything that differs is fixed here or raised.

Only the local app is pointed at Cloud Run. The hosted app keeps using RunPod until ticket 09.

See `docs/specs/model-host-cloud-run.md`, section "Retiring RunPod". Terms are defined in `CONTEXT.md`.

**Needs the owner:** The verdict on the replies is the owner's, made by reading.

**Blocked by:** 02 — Comparison messages, a RunPod baseline, and explicit sampling; 04 — A model host on Cloud Run, deployed by hand.

**Status:** ready-for-agent

- [ ] With the local variables set to the Cloud Run host's URL and key, the session start wakes the model and the greeting arrives, with the same wait message as before.
- [ ] A chat reply streams word by word and is in Catalan.
- [ ] With the translation toggle on, a message is translated and not answered.
- [ ] A reply the model would sign off is cut where the sign-off would begin, and no stop sequence is rejected or ignored by the host.
- [ ] Token counts arrive with each streamed reply: the server's `reply_tokens` log line carries both counts.
- [ ] A conversation long enough to approach the context window gets a clear failure and not a silent truncation or a hang; what happens is noted.
- [ ] Cloud Run's replies to the comparison messages are recorded beside the RunPod baseline, with the date and the host named.
- [ ] The owner has read both sets and their verdict is recorded: as good, or not, with the messages that fell short.
- [ ] Any change the app or the server flags needed to pass the above is made, and the existing tests still pass.
