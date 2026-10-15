# 03 — Open the offer from the keyboard

**What to build:** A keyboard or screen-reader user can open the **offer** under a **reply**, hear or save it, and close it again, without a pointer. Each reply gains a disclosure button beside it that says whether its offer is open. Tapping the reply keeps working as it does now.

The reply bubble itself is not made a button, because it may contain links, which must stay reachable as links.

See `docs/specs/accessibility-aa.md`, section "The offer". Terms are defined in `CONTEXT.md`.

**Blocked by:** 01 — Automated accessibility checks, names and language; 02 — Legible in both themes, and big enough to hit.

**Status:** ready-for-agent

- [ ] Each reply in the **conversation** under which a tap would open an offer has a disclosure button named `Opcions de la resposta`, with `aria-expanded` showing whether its offer is open and `aria-controls` pointing to it.
- [ ] Where a tap does nothing (the reply that is speaking and cannot be saved, or no speech and no **exchange**), there is no disclosure button.
- [ ] While a reply is being written, every disclosure button is disabled.
- [ ] Pressing the disclosure button opens the offer and leaves focus on the button. The offer's buttons come next in the tab order. Pressing it again closes the offer.
- [ ] Escape, with focus on the disclosure button or in the offer, closes the offer and puts focus on the disclosure button.
- [ ] Focus leaving both the disclosure button and the offer closes the offer.
- [ ] Opening another reply's offer, by button or by tap, closes the one that was open, as now.
- [ ] Tapping a reply still opens and closes its offer, with the existing exceptions for links, text selection and a reply being written.
- [ ] The disclosure button is at least 24 by 24 CSS pixels and uses the colour tokens from ticket 02.
- [ ] The axe checks gain a state with an offer open, and pass.
- [ ] Tests drive each criterion above with the keyboard, extending the existing chat component tests. Existing tap tests still pass.
- [ ] `npm test` and `npm run lint` pass.
