# 07 — Manual check before release

**What to build:** Confidence that the chat meets WCAG 2.2 AA on real devices and assistive technology, where the automated checks cannot see: contrast, size, reflow, zoom, and how a screen reader actually behaves. A written checklist is kept beside the spec, run once against the finished work, and its findings recorded.

See `docs/specs/accessibility-aa.md`, section "Testing Decisions". Terms are defined in `CONTEXT.md`.

**Needs the owner:** The checks with VoiceOver on an iPhone and a Mac need real devices. An agent can write the checklist and do the browser-based checks; the owner runs the VoiceOver passes or explicitly delegates them.

**Blocked by:** 02 — Legible in both themes, and big enough to hit; 03 — Open the offer from the keyboard; 04 — Hear what the chat is doing; 05 — Errors in Catalan, with a retry; 06 — Undo deleting a saved exchange.

**Status:** waiting on the owner to run the checklist (`docs/specs/accessibility-aa-checklist.md`)

- [x] A checklist is written beside the spec, covering: keyboard only through every control in the chat and the **saved exchanges**; VoiceOver on iOS Safari and on macOS Safari through a **session**, a **reply**, the **offer**, an error with retry, and deleting and undoing a saved exchange; 200% zoom; 320 CSS pixels wide; contrast measured in both themes; visible focus on every control.
- [x] Each item names what to do and what should happen, so that it can be rerun before a later release.
- [ ] The checklist is run once against the merged work, and the result of each item is recorded in this ticket.
- [ ] Any failure found is either fixed here, if small, or written up as its own ticket.
