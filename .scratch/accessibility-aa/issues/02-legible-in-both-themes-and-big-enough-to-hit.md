# 02 — Legible in both themes, and big enough to hit

**What to build:** A person with low vision can read every hint, status line and error, and can see where to type, in both light and dark themes. A person with limited dexterity can hit every button without pressing its neighbour. The chat keeps working at 200% zoom and on a screen 320 pixels wide without scrolling sideways.

It begins with a prefactor: the colours the chat uses for text, hints, borders and errors become theme tokens in the global stylesheet, defined for both themes, so that the components use named colours instead of opacities. Later tickets that add controls or messages use these tokens.

See `docs/specs/accessibility-aa.md`, section "Contrast and size". Terms are defined in `CONTEXT.md`.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] Text, hint, border and error colours are theme tokens with light and dark values. The components use the tokens, not opacities of black or white, except for disabled controls.
- [ ] All text meets 4.5:1 against what is behind it in both themes, including the empty-conversation hint, the waking and thinking lines, `Pensant…` on the tinted **reply** background, the empty saved-exchanges hint, and the labels of buttons.
- [ ] Error text meets 4.5:1 in both themes. Dark mode has its own, lighter red.
- [ ] The message field's border meets 3:1 against the background in both themes.
- [ ] Disabled controls keep their reduced opacity.
- [ ] Every control is at least 24 by 24 CSS pixels. The header's icon buttons are padded to reach it without their icons growing.
- [ ] At 320 CSS pixels wide and at 200% zoom, nothing scrolls sideways except code blocks and tables inside a reply.
- [ ] The ticket records the contrast ratios measured in a browser for each changed colour, in both themes. jsdom cannot compute them, so no automated test asserts them.
- [ ] The axe checks from ticket 01 still pass, if 01 has landed.
- [ ] `npm test` and `npm run lint` pass.
