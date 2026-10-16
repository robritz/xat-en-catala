# Accessibility check before release

What the automated checks can't see, for `docs/specs/accessibility-aa.md`. Run it against the hosted app, unlocked, before a release that changes the chat or the saved exchanges. Terms in **bold** are defined in `CONTEXT.md`.

Each item says what to do and what should happen. Record a failure with the device, browser and theme.

## Keyboard only (macOS Safari and Chrome)

In Safari, turn on "Press Tab to highlight each item on a webpage" first.

1. Tab from the address bar through the whole page. **Expect:** every control is reached in reading order: the header buttons, each **reply**'s `Opcions de la resposta` button, the translate toggle, the message field, `Envia`. Each one shows a visible focus indicator.
2. Start a **session** with Enter on `Iniciar la sessió`. **Expect:** the greeting arrives and focus lands in the message field.
3. Send a **message**, then Tab to its reply's `Opcions de la resposta` and press Enter. **Expect:** the **offer** opens, focus stays on the button, and the next Tab reaches `Escolta`, then `Desa`.
4. With focus in the offer, press Escape. **Expect:** the offer closes and focus returns to `Opcions de la resposta`.
5. Open the offer, then Tab past it to the next control. **Expect:** the offer closes.
6. Open `Desats`, open a row with Enter, Tab to `Suprimeix` and press it. **Expect:** focus moves to the next row and `S'ha suprimit.` appears with `Desfés`. Tab to `Desfés` and press it. **Expect:** the **saved exchange** is back in its place, with focus on its row.
7. Tab to a link in a reply and press Enter. **Expect:** it opens in a new tab and the offer doesn't open.

## VoiceOver on macOS Safari

8. Navigate by landmarks (VO-U, Landmarks). **Expect:** a banner, a main region, and a form named `Missatge`.
9. Send a message. **Expect:** VoiceOver says `Pensant…`, then reads the reply once, whole, not word by word as it streams.
10. Send a message in English. Move to it in the conversation. **Expect:** it is read in the default voice, not a Catalan one. The reply is read in a Catalan voice.
11. Move to the message field. **Expect:** it is announced as `Missatge`, and as `Text per traduir` with Tradueix on. Tradueix is announced as a toggle with its state.
12. Move to `Opcions de la resposta`. **Expect:** it is announced as collapsed, and as expanded once pressed.
13. Turn the network off and send a message. **Expect:** VoiceOver interrupts with `No s'ha pogut connectar. Comprova la connexió i torna-ho a provar.` Turn the network on and press `Torna-ho a provar`. **Expect:** the reply arrives, with the message shown once.
14. Delete a saved exchange. **Expect:** `S'ha suprimit.` is announced.
15. Reload, and start a session during a **cold start**. **Expect:** `La IA s'està despertant…` is announced.

## VoiceOver on iOS Safari

16. Repeat 9 to 14 by swiping and double-tapping. **Expect:** the same announcements. Double-tapping a reply bubble opens its offer, as tapping does with VoiceOver off.
17. With VoiceOver off, tap a reply. **Expect:** its offer opens, as before this work.

## Zoom and narrow screens

18. In desktop Safari or Chrome, zoom to 200%. **Expect:** nothing is cut off and the page doesn't scroll sideways. Code blocks and tables in a reply may scroll on their own.
19. Set the window, or the responsive design view, to 320 CSS pixels wide. Send a message with a long unbroken word, such as a URL. **Expect:** the same as 18; the long word wraps in the message and in the reply.
20. On iPhone, set the largest text size in Settings. **Expect:** the chat is usable and the header buttons don't overlap.

## Contrast, in both themes

Measure with a contrast checker (for example the colour picker in Chrome's DevTools) in light mode and again in dark mode.

21. The empty-conversation hint, the waking line, `Pensant…` on its bubble, the empty saved-exchanges hint, `S'ha suprimit.`, and every error. **Expect:** 4.5:1 or more.
22. The message field's border against the page. **Expect:** 3:1 or more.
23. White text on the blue `Envia`, `Iniciar la sessió` and message bubbles, and links in replies. **Expect:** 4.5:1 or more.

## Target size

24. Measure the header buttons, `Opcions de la resposta`, and the buttons in the offer and the saved-exchanges list in DevTools. **Expect:** each is 24 by 24 CSS pixels or more.
