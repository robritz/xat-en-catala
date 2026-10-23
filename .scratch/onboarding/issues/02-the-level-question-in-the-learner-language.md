# 02 — The level question in the learner's language

**What to build:** Once a first-time learner has chosen their **native language**, the level question, a one-line description of each **level** and the onboarding controls are shown in that language, so that a learner who reads no Catalan can judge their level. A back control returns to the native language question. See `docs/specs/onboarding.md`; terms in bold are defined in `CONTEXT.md`.

**Blocked by:** 01 — Replies pitched at the learner profile.

**Status:** in review: waiting on a native speaker's check of the French, German and Basque

- [x] The level question, its six level descriptions, the back control and the start button are held in each of English, Español, Euskara, Galego, Français and Deutsch, and shown in the native language chosen.
- [x] The level descriptions are drafted from the Council of Europe's CEFR self-assessment wording, one line each.
- [x] The back control returns to the native language question with the earlier choice still chosen.
- [x] Focus moves to the level question when it appears, and to the native language question on going back.
- [x] Each native language option is marked with its own `lang`, and the level step is marked with the `lang` of the language chosen.
- [x] No other part of the interface is translated.
- [x] Chat tests check that the level question appears in the chosen language for at least two languages, and that back returns to the first question.
- [ ] The pull request notes that the French, German and Basque text needs a native speaker's check before merging, and that check is done.
