# 07 — ALIA's replies come to an end

**What to build:** No **reply** from ALIA runs on until the chat route's time limit cuts it off. In ticket 06, 3 of 9 replies repeated a sentence or a paragraph without end, and the route gave up on each after 180 seconds and about 5,700 tokens. The learner watched the reply grow for three minutes and then saw "Upstream error". A reply ends on its own, or is cut at a length no learner needs, and is shown as cut, as a reply that runs into the context limit already is.

See ticket 06's outcome, finding 1, and `docs/specs/alia-model.md`, "The app".

**Needs the owner:** Changing ALIA's sampling departs from what BSC advises, a temperature of 0 to 0.2 and no repetition penalty. Agree the approach before building it.

**Blocked by:** 06 — The chat on ALIA, end to end.

**Status:** ready-for-agent

- [ ] The three prompts that ran away in ticket 06 are run again, several times each, and every reply ends within a minute.
- [ ] The fix is one of these, or several, chosen with the owner and recorded here with the reason:
  - a cap on a reply's tokens;
  - a repetition or frequency penalty for ALIA;
  - a different temperature for ALIA.
- [ ] A reply cut by a cap is shown as cut, as one that runs into the context limit is.
- [ ] Salamandra's requests are unchanged, unless the owner chooses a cap for both.
- [ ] The model module's tests check the request each model's host receives with the new settings.
