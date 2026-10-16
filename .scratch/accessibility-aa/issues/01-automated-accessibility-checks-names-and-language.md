# 01 — Automated accessibility checks, names and language

**What to build:** The chat's tests catch the accessibility faults a machine can find, and the chat passes them. A screen-reader user hears the message field named for what it is for, and hears every **message** in a neutral voice instead of a Catalan one, whatever language it was written in.

This also sets up the harness that later tickets extend with the states they add (an open **offer**, an error).

See `docs/specs/accessibility-aa.md`, sections "Scope", "Language", "Labels" and "Testing Decisions". Terms are defined in `CONTEXT.md`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] `axe-core` is added as a development dependency and run against the rendered chat in the existing chat component tests.
- [ ] Axe reports no violations in each of these states: before a session has started; with a **conversation** of at least one **exchange**; showing the **saved exchanges** with nothing saved; showing them with a row open.
- [ ] The secret-phrase screen is not checked, as it is out of scope.
- [ ] The message field has an accessible name from a visually hidden label: `Missatge`, or `Text per traduir` while translating. Its placeholder and the `Envia` button are unchanged.
- [ ] Each message in the conversation is marked `lang=""`. Each message in the saved-exchanges list is too. The page stays `lang="ca"` and **replies** are unmarked.
- [ ] Every icon button in the chat and the list has an accessible name. Any found without one is named.
- [ ] Tests assert the field's name in both modes and the `lang` marking in both views, by role and name as a user of assistive technology would find them.
- [ ] `npm test` and `npm run lint` pass.
