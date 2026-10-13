# 05 — The app against Cloud Run, compared with RunPod

**What to build:** The chat working end to end against the Cloud Run **model host**, and a recorded answer to whether its **replies** are as good as RunPod's. With the app's local variables pointed at Cloud Run, a learner can start a **session**, chat, and translate exactly as before. The comparison **messages** are replayed against Cloud Run and set beside the RunPod baseline for the owner to read.

This is where behaviours that have only ever run against RunPod's worker are tried on llama.cpp for the first time: the stop sequences that cut a sign-off, the token counts on a streamed reply, and the chat template. Anything that differs is fixed here or raised.

Only the local app is pointed at Cloud Run. The hosted app keeps using RunPod until ticket 09.

See `docs/specs/model-host-cloud-run.md`, section "Retiring RunPod". Terms are defined in `CONTEXT.md`.

**Needs the owner:** The verdict on the replies is the owner's, made by reading.

**Blocked by:** 02 — Comparison messages, a RunPod baseline, and explicit sampling; 04 — A model host on Cloud Run, deployed by hand.

**Status:** ready-for-agent

- [x] With the local variables set to the Cloud Run host's URL and key, the session start wakes the model and the greeting arrives, with the same wait message as before.
- [x] A chat reply streams word by word and is in Catalan.
- [x] With the translation toggle on, a message is translated and not answered.
- [x] A reply the model would sign off is cut where the sign-off would begin, and no stop sequence is rejected or ignored by the host.
- [x] Token counts arrive with each streamed reply: the server's `reply_tokens` log line carries both counts.
- [x] A conversation long enough to approach the context window gets a clear failure and not a silent truncation or a hang; what happens is noted.
- [x] Cloud Run's replies to the comparison messages are recorded beside the RunPod baseline, with the date and the host named.
- [ ] The owner has read both sets and their verdict is recorded: as good, or not, with the messages that fell short.
- [x] Any change the app or the server flags needed to pass the above is made, and the existing tests still pass.

## Outcome

Checked on 2026-10-13 against revision `model-host-00001-2cz`, image `service:5a35510`, through the local app with `MODEL_HOST_URL` set to the service's URL followed by `/v1`. The RunPod values are kept beside it in `.env.local.runpod`, which is git-ignored.

- **Session start.** The hidden greeting message got a greeting in Catalan with a fact about Catalonia, 0.9 seconds to the first word on a warm instance. The wait message is the UI's own and nothing in it changed. The session start was not tried through a cold start here; the cold start itself is measured in ticket 04.
- **Streaming.** The greeting arrived as 34 separate pieces over 0.9 seconds.
- **Translation.** All four translation messages were rendered and not answered, in three runs of the set.
- **Stop sequences.** Sent straight to the host, a text holding "Salutacions" and "(fi)" came back whole without stop sequences and cut before "Salutacions" with the app's three. Six stop sequences were accepted and honoured too, so RunPod's limit of four does not apply to llama.cpp. `SIGN_OFFS` is left at three while RunPod still serves the hosted app.
- **Token counts.** Every reply's `reply_tokens` line carried both counts, and every reply in the recorded set has them.
- **Chat template.** A conversation of three turns was answered from its earlier turns ("Com em dic?" got "Et dius Rob."). The counts of tokens read match RunPod's on the chat messages and are one or two lower on the translations and one chat message, which was not looked into.

### The context window

The host gives each reply 8,192 tokens for the conversation and the reply together.

- **A conversation already over it** is refused by the host at once with a 400, "request (8534 tokens) exceeds the available context size (8192 tokens)". The app shows "Error: Upstream error". Nothing hangs and nothing is cut, but the learner is not told that a new conversation is the way out, and every later message fails the same way. **Raised, not changed.**
- **A reply that runs into it** is cut where it stands, mid-sentence, and the host reports no error: only a finish reason of "length". This was a silent truncation. **Fixed:** the chat now says under such a reply that it was cut because the conversation is too long, and suggests a new one. Confirmed live that the reason reaches the browser, with a conversation of 8,166 tokens whose reply stopped after 26.

### Differences from RunPod, raised

- **A leading space.** Nine of the 33 replies in three runs of the set begin with a space, and none of RunPod's do. It does not show in the chat, where a reply is rendered as Markdown, and it is trimmed before a reply is spoken. Left as it is.
- **Stray words.** In three runs of the set, two replies carried a few words of nonsense: "coedits can't add vocabulary or explain rules in the response." at the end of the first run's reply about the weather, and "S ikast reportatge" as the subject of a letter in the third. RunPod's baseline has oddities of its own, English glosses in brackets among them, but nothing like these. The first run is the one recorded, as it came.

### The verdict

Cloud Run's replies are in `docs/comparison/replies-cloud-run.md`, beside `docs/comparison/baseline-runpod.md`. The owner's verdict is still to come, so that box is open.
