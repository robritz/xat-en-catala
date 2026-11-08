# 10 — Replies in plain text

**What to build:** ALIA's replies read as plain text in the chat. ALIA formats with Markdown (`**…**`, `*…*`), which the chat shows as typed, asterisks and all. It once opened a question with the Spanish "¿", which Catalan does not use. Either the model is asked for plain text, or the chat renders the Markdown it is sent.

See ticket 06's outcome, finding 5.

**Needs the owner:** Choose between asking for plain text and rendering Markdown. Rendering changes what every reply looks like, and what is spoken and saved.

**Blocked by:** 07 — ALIA's replies come to an end.

**Status:** ready-for-agent

- [ ] Replies from ALIA show no Markdown markup in the chat.
- [ ] If Markdown is rendered, the text that is spoken and the text that is saved carry no markup either.
- [ ] If the prompt asks for plain text, Salamandra's replies are checked to be unchanged.
