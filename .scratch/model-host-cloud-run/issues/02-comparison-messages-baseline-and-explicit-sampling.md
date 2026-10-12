# 02 — Comparison messages, a RunPod baseline, and explicit sampling

**What to build:** The means to tell whether a second **model host** answers as well as the first. Three things make that possible. A fixed set of about ten **messages** is kept in the repository, so the same set is used every time. RunPod's **replies** to them are recorded beside it as the baseline. And the app sends its sampling values on every request, so that two hosts running different engines are asked for the same thing.

Today the app sets no sampling values and inherits whatever the host's engine defaults to. The model's own `generation_config.json` names none either. The values the app sends must be the ones RunPod effectively applies today, so that replies do not change for learners; these are expected to be a temperature of 1 and a top-p of 1, and must be confirmed against the running endpoint before they are fixed.

See `docs/specs/model-host-cloud-run.md`, sections "The app" and "Retiring RunPod". Terms are defined in `CONTEXT.md`.

**Needs the owner:** RunPod must be awake for the confirmation and the baseline. Ask before waking it; it bills while it runs.

**Blocked by:** 01 — The app talks to a model host, not to RunPod.

**Status:** ready-for-agent

- [ ] A plain file of about ten messages is checked in. It covers ordinary chat in more than one language, a request to reply in another language, **translation** with the toggle on, a translation of a text that itself ends in a sign-off, and a chat message whose reply the model tends to sign off.
- [ ] Each message records whether it is sent as chat or as a translation, so it can be replayed the same way.
- [ ] RunPod's effective temperature and top-p are established from the running endpoint or its worker's configuration, and how they were established is written down in the ticket or the commit.
- [ ] The app sends that temperature and top-p on every request, for chat and for translation.
- [ ] A test asserts that both values are sent.
- [ ] RunPod's replies to the comparison messages, taken with the explicit values in place, are recorded beside the messages as the baseline, with the date and the host named.
- [ ] How to replay the set against a host is described in a few lines next to the file. A script is acceptable but not required; judging the replies stays a matter of reading.
- [ ] `npm test` and `npm run lint` pass.
