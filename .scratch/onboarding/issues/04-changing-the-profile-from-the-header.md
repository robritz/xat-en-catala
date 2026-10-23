# 04 — Changing the profile from the header

**What to build:** Once the learner has a **learner profile**, the header shows their **level**. Tapping it asks the two questions again with the current answers chosen, so that a learner who has moved up a level can say so. The change applies from the next **message**, and the **conversation** is kept. See `docs/specs/onboarding.md`; terms in bold are defined in `CONTEXT.md`.

**Blocked by:** 01 — Replies pitched at the learner profile.

**Status:** ready-for-agent

- [ ] With the chat unlocked and a profile held, the header shows a button labelled with the level, such as `B1`, with the accessible name `Perfil d'aprenent, nivell B1`.
- [ ] The button opens the native language and level questions with the current answers chosen.
- [ ] Saving stores the new profile, the button shows the new level, and the next request carries it.
- [ ] Closing without saving changes nothing.
- [ ] The conversation is kept. A reply being written when the profile changes finishes as it began.
- [ ] `Nova conversa` keeps the profile.
- [ ] Focus returns to the header button when the questions close, and editing can be done with the keyboard alone.
- [ ] The button's tap target meets the size of the other header buttons.
- [ ] Chat tests check the button's label and accessible name, that saving changes what the next request carries and is stored, that the conversation is kept, that closing changes nothing, and where focus goes.
