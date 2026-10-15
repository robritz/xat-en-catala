# 04 — Hear what the chat is doing

**What to build:** A screen-reader user is told when the model is waking, when it is thinking, and what it replied, without being interrupted word by word while the **reply** streams. They are also told when a reply was cut short.

See `docs/specs/accessibility-aa.md`, section "Announcements". Terms are defined in `CONTEXT.md`.

**Blocked by:** 01 — Automated accessibility checks, names and language.

**Status:** ready-for-agent

- [ ] The **conversation** is a `role="log"` region.
- [ ] The log is marked `aria-busy="true"` while a reply is being written, and not otherwise, so that each reply is announced once and whole. This includes the greeting at the start of a **session** and a reply that fails partway.
- [ ] `La IA s'està despertant…` and `Pensant…` are in `role="status"` regions.
- [ ] The notice that a reply was cut short is in a `role="status"` region.
- [ ] Showing the **saved exchanges** and returning does not leave the log marked busy.
- [ ] Tests assert the roles, and that the log is busy while a faked reply streams and not once it ends.
- [ ] The axe checks still pass.
- [ ] `npm test` and `npm run lint` pass.
