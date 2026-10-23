# 01 — Replies pitched at the learner profile

**What to build:** A first-time learner who has entered the secret phrase is asked two questions in place of the `Iniciar la sessió` button: which language they read best, their **native language**, and how well they know Catalan, their **level**. Finishing stores the **learner profile** on the device and starts the **session**, and from then on every **reply**, the greeting included, is pitched at the learner's level, with explanations in their native language at A1–A2. A returning learner with a stored profile sees `Iniciar la sessió` as today. A **translation** is unchanged. See `docs/specs/onboarding.md` for the full design; terms in bold are defined in `CONTEXT.md`.

In this ticket the level question and its controls are in Catalan with English beneath them; ticket 02 puts them in the learner's language.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] With the chat unlocked and no profile stored, the native language question appears instead of `Iniciar la sessió`, offering English, Español, Euskara, Galego, Français and Deutsch, each in its own language, under a heading in Catalan with English beneath it.
- [ ] Choosing a native language shows the level question, offering A1 to C2, and a start button.
- [ ] Neither question appears before the secret phrase has been entered.
- [ ] The start button stores the profile in `localStorage` under `learner-profile`, as `{ version, nativeLanguage, level }`, then starts the session as `Iniciar la sessió` does: the hidden greeting is sent and the waking spinner shows until it arrives.
- [ ] With a profile stored, `Iniciar la sessió` shows as today, and no question is asked.
- [ ] Every request to `POST /api/chat`, the greeting included, carries `profile: { nativeLanguage, level }` beside the messages, as codes only.
- [ ] The server checks both codes against its own lists. A missing profile, an unknown native language or an unknown level gets today's system prompt, unchanged.
- [ ] The server maps the levels to three tiers, A1–A2, B1–B2 and C1–C2, and builds the system prompt from the tier, as set out in the spec. Only A1–A2 names the native language. The rule against using another language unless asked stays.
- [ ] A translation request uses the translation prompt and ignores the profile.
- [ ] The `reply_tokens` log line includes the tier, or none when the prompt is today's.
- [ ] `Desats` can be opened while onboarding is shown, as it can before the session starts today.
- [ ] Each question is a labelled group of choices, and onboarding can be completed with the keyboard alone.
- [ ] Route tests, with the mocked model, check the instructions for a profile in each tier, for a missing and an unknown profile, for a translation with a profile, and the tier in the log line.
- [ ] Chat tests check that onboarding appears only after unlocking with no profile, that finishing stores the profile and starts the session with a greeting request carrying it, and that a stored profile shows the start button and is carried on every request.
- [ ] `CONTEXT.md` is unchanged unless a new term comes up, and the docs guide (`docs/guide.md`) describes onboarding and the profile beside the secret phrase and saved exchanges.
