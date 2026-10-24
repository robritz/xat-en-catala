# 05 — Checking the French and German explanations and the tiers

**What to build:** Evidence that the tiers and the two native languages the model was not tuned for work as intended, kept beside the other comparisons. The model is tuned for Catalan, Spanish, Basque, Galician and English; French and German stay on the list only if their explanations hold up. See `docs/specs/onboarding.md`; terms in bold are defined in `CONTEXT.md`.

**Blocked by:** 01 — Replies pitched at the learner profile.

**Status:** in review: results in `docs/comparison/tiers/README.md`; the owner to decide on French and German and on rewording the tiers

- [x] The comparison messages in `docs/comparison/` are replayed against the deployed **model host** with a profile in each tier, and with A1 profiles in French, German and English. The replay script takes a profile to do so.
- [x] The replies are saved in `docs/comparison/`, with a short note of what was found.
- [ ] Replies at A1–A2, B1–B2 and C1–C2 differ in length and difficulty as the spec intends. If they don't, the tiers' wording is adjusted and replayed.
- [ ] At A1, French and German explanations are correct and stay in that language. Any language whose explanations don't hold up is removed from the list, with the reason in the note.
- [ ] The owner has read the results and agreed to what stays.
