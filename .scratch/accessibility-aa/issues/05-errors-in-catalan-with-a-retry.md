# 05 — Errors in Catalan, with a retry

**What to build:** When a **reply** cannot be had, the learner is told in Catalan what went wrong and what to do, never shown the raw error. A `Torna-ho a provar` button asks again for the reply to their last **message** without them retyping it. A screen-reader user hears the error when it appears.

See `docs/specs/accessibility-aa.md`, section "Errors". Terms are defined in `CONTEXT.md`.

**Blocked by:** 01 — Automated accessibility checks, names and language; 02 — Legible in both themes, and big enough to hit.

**Status:** done

- [x] A failure to reach the network shows `No s'ha pogut connectar. Comprova la connexió i torna-ho a provar.`
- [x] A failure or timeout from the server or the **model host**, and any other failure, shows `La IA no ha pogut respondre. Torna-ho a provar.`
- [x] The raw error text is never shown. It is still logged to the console.
- [x] A `Torna-ho a provar` button follows the message. Pressing it clears the error and asks again for the reply to the last message, which is not duplicated in the **conversation**.
- [x] The retry works for a **translation** as for an ordinary message, keeping the message's mode.
- [x] There is no retry button when there is no message to retry, such as when the greeting at the start of a **session** fails, which keeps its existing way to start again.
- [x] The message and its button are in a `role="alert"` region, styled with the error colour token from ticket 02, and the button is at least 24 by 24 CSS pixels.
- [x] The axe checks gain an error state, and pass.
- [x] Tests fake each failure, assert the message shown, and assert that the retry sends the last message again.
- [x] `npm test` and `npm run lint` pass.
