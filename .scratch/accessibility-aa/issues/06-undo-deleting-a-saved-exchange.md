# 06 — Undo deleting a saved exchange

**What to build:** A learner who deletes a **saved exchange** by mistake can bring it back where it was. Deleting still happens at once, and the list then offers `Desfés` until the learner deletes another or leaves the list.

This reverses a decision in the saved-exchanges spec, which said deletion has no undo.

See `docs/specs/accessibility-aa.md`, section "Undoing a deletion". Terms are defined in `CONTEXT.md`.

**Blocked by:** 01 — Automated accessibility checks, names and language; 02 — Legible in both themes, and big enough to hit.

**Status:** ready-for-agent

- [ ] Deleting a saved exchange removes it at once and shows `S'ha suprimit.` with a `Desfés` button at the top of the list, in a `role="status"` region.
- [ ] Focus after a deletion goes to the row that took the deleted one's place, or the last row, as now.
- [ ] `Desfés` restores the exchange at the place it was deleted from, or at the end if the list is now shorter than that. The notice then goes.
- [ ] The undo has no time limit. A second deletion replaces it with its own. Leaving the list ends it.
- [ ] If the exchange has been saved again meanwhile, for example from another tab, `Desfés` changes nothing and does not duplicate it.
- [ ] The storage module gains a way to insert a saved exchange at a given place. Like every other write, it reads the stored list at that moment, applies the one change, and reports a failed write. If the write fails, the notice says the exchange could not be restored.
- [ ] `Nova conversa` gains no undo.
- [ ] The `Desfés` button is at least 24 by 24 CSS pixels and uses the colour tokens from ticket 02.
- [ ] `docs/specs/saved-exchanges.md` is updated where it says deletion has no undo and where it lists undo as out of scope, pointing to the accessibility spec.
- [ ] Tests, driven through the chat, cover: undo restoring at its place; a deletion after the list has shrunk; a second deletion replacing the undo; leaving the list ending it; a re-save from another tab making undo do nothing; a failed write.
- [ ] The axe checks still pass with the notice shown.
- [ ] `npm test` and `npm run lint` pass.
