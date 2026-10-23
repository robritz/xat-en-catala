# 03 — A profile that can't be stored or read

**What to build:** When the stored **learner profile** has been lost or can't be read, the learner is taken through **onboarding** again rather than the app guessing. When the browser refuses to store the profile, the **session** starts anyway with the profile chosen, and the learner is asked again on their next visit, with no error shown. See `docs/specs/onboarding.md`; terms in bold are defined in `CONTEXT.md`.

**Blocked by:** 01 — Replies pitched at the learner profile.

**Status:** done

- [x] Stored data that is unparseable, of another version, or has a native language or level outside the lists is read as no profile, and onboarding is shown.
- [x] Such data is left as it is until the next write, which replaces it.
- [x] If the browser refuses the write, the session starts, and every request in the visit carries the profile chosen.
- [x] A refused write shows no error.
- [x] Chat tests cover each kind of unreadable data and a refused write, following the saved exchanges tests for storage that can't be read or written.
