# 08 — ALIA writes in Catalan, and explains in the native language

**What to build:** ALIA follows the teacher prompt's language rules as Salamandra does.

In ticket 06 it did not:
- With no **learner profile**, it answered English questions in English.
- For a Spanish A1 learner, it explained "bon profit" in Catalan, where the **tier**'s rules ask for one word explained in the native language.
- For an English A1 learner, the greeting was followed by a full English version of the reply in brackets, not one word explained.

See ticket 06's outcome, findings 2 and 3, and `TEACHER` and the tier rules in `src/lib/model-host.ts`.

**Needs the owner:** The spec puts separate prompts for ALIA out of scope. Decide whether to change the shared prompts, or allow ALIA prompts of its own.

**Blocked by:** 07 — ALIA's replies come to an end. A reply that never ends can't be judged.

**Status:** ready-for-agent

- [ ] With no profile, a message written in English gets a reply in Catalan.
- [ ] With an A1 or A2 profile, the reply explains one word or expression in the native language, and is otherwise in Catalan.
- [ ] With a B1 to C2 profile, any explanation is in Catalan.
- [ ] Each case is checked several times against ALIA. Salamandra is checked as well, if the shared prompts change.
- [ ] Where the prompts change, the model module's tests check the instructions sent.
