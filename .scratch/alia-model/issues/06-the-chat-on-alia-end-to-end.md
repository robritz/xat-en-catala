# 06 — The chat on ALIA, end to end

**What to build:** The chat running on ALIA, seen from the learner's side. With `MODEL=alia`, a **session** starts, the first **message** is held through ALIA's **cold start**, and **replies**, **translations**, replies pitched at a **tier** and the cut before a sign-off all work. Switching back to Salamandra works as well. This checks that things work, not how good the replies are; judging ALIA against Salamandra is the owner's and out of scope.

See `docs/specs/alia-model.md`, user stories 10 to 15.

**Needs the owner:** Pointing the hosted app at ALIA serves every learner from ALIA. Do this against a local or preview run of the app unless the owner says otherwise.

**Blocked by:** 01 — The app chooses its model with one setting; 05 — A merge deploys ALIA.

**Status:** ready-for-agent

- [ ] With `MODEL=alia` and ALIA's variables set, opening the chat from zero instances wakes ALIA, shows the usual wait, and delivers the greeting without the route timing out.
- [ ] A message gets a streamed reply in Catalan with its token counts.
- [ ] With translation on, a message gets a translation into Catalan and not an answer.
- [ ] With a beginner's **learner profile**, a reply includes an explanation in the native language, as the tier's rules ask.
- [ ] A reply that would end in a sign-off is cut before it, and the request carrying the stop sequences does not fail or come back empty.
- [ ] With `MODEL` unset again, the chat replies from Salamandra.
- [ ] Anything ALIA gets wrong that the shared prompts or stop sequences cause is recorded in this ticket for the owner, not fixed here.
