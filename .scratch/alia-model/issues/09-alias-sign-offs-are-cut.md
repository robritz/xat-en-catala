# 09 — ALIA's sign-offs are cut

**What to build:** A reply from ALIA that ends in a sign-off is cut before it, as Salamandra's are.

`SIGN_OFFS` is `["\nSalutacions", " Salutacions", "(fi)"]`. ALIA's sign-offs in tickets 04 and 06 matched none of them:
- `*Salutacions,`, with Markdown before it;
- "Atentament,";
- "Petons i abraçades", followed by "De la teva amiga inquieta, Pandora".

See ticket 06's outcome, finding 4.

**Needs the owner:** The spec keeps the stop sequences shared by both models. A wider list cuts Salamandra's replies at the same places too. Agree the list.

**Blocked by:** 06 — The chat on ALIA, end to end.

**Status:** ready-for-agent

- [ ] The sign-offs ALIA was seen to use are cut before they start, including when Markdown comes before them.
- [ ] A reply that only mentions a sign-off word in passing, such as one explaining what "Salutacions" means, is not cut there, or the risk is recorded with the owner's choice.
- [ ] A translation is still never cut.
- [ ] The model module's tests check the stop sequences sent.
- [ ] A letter or email asked of ALIA, as in ticket 06, comes back without its sign-off.
