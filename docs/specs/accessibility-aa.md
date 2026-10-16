# Accessibility to WCAG 2.2 AA

Terms in **bold** on first use are defined in `CONTEXT.md` at the repository root. Use them as defined there.

**Status:** ready-for-agent

## Problem Statement

The chat can only be used fully with a pointer and good eyesight. The **offer** under a **reply** opens when the reply is tapped, but the reply is a plain element with a click handler, so a keyboard user cannot reach it and a screen-reader user is not told it exists. Hint text and borders are too faint to read for many people. A screen reader is not told when a reply arrives or when the model is thinking, and reads every **message** in a Catalan voice whatever language it was written in. Errors show whatever the server or network returned, often in English and technical. A **saved exchange** can be deleted with one tap and no way back.

## Solution

The chat meets WCAG 2.2 Level AA. The offer gains a proper disclosure control beside each reply, alongside the existing tap. Text and essential borders meet AA contrast in both light and dark themes. The conversation announces each reply once it has arrived, and the thinking and waking states are announced as status. Messages are marked as being of unknown language. Errors are described in Catalan, with a way to try again. Deleting a saved exchange can be undone.

AAA is not a goal. The secret-phrase screen is out of scope, as it is to be removed.

## User Stories

### The offer

1. As a keyboard user, I want to open the offer under a reply, so that I can hear or save it without a pointer.
2. As a screen-reader user, I want each reply to have a control that announces whether its offer is open, so that I know the offer exists and what state it is in.
3. As a touch user, I want tapping a reply to keep opening its offer, so that the gesture I know still works.
4. As a keyboard user, I want the offer to come straight after its control in the tab order, so that I can reach its buttons without hunting.
5. As a keyboard user, I want Escape to close the offer and return me to its control, so that I do not lose my place.
6. As a keyboard user, I want the offer to close when I tab away from it, as it closes when a pointer user taps elsewhere, so that both ways of working behave alike.
7. As a keyboard user, I want links in a reply to stay reachable as links, so that opening the offer does not cost me them.

### Seeing

8. As a person with low vision, I want hint and status text to be legible, so that I can read the instructions and know what the chat is doing.
9. As a person with low vision, I want to see where the message field is, so that I know where to type.
10. As a dark-mode user, I want the same legibility as in light mode, so that my choice of theme does not cost me.
11. As a person with limited dexterity, I want every button to be large enough or far enough from its neighbours to hit, so that I do not press the wrong one.
12. As a person who zooms the page to 200% or uses a narrow screen, I want the chat to keep working without scrolling sideways, so that I can read replies in full.

### Hearing what happens

13. As a screen-reader user, I want each reply read to me once it has arrived in full, so that I am not interrupted word by word while it streams.
14. As a screen-reader user, I want to be told when the model is waking and when it is thinking, so that I know to wait.
15. As a screen-reader user, I want my messages read in a neutral voice, not a Catalan one, so that a message in English or Spanish is intelligible.
16. As a screen-reader user, I want the message field to have a name, so that I know what it is for.

### Errors

17. As a learner, I want an error described in Catalan with a suggestion of what to do, so that I understand what went wrong.
18. As a learner, I want a button to try again after an error, so that I do not have to retype my message.
19. As a screen-reader user, I want an error announced when it appears, so that I do not wait for a reply that is not coming.

### Deleting

20. As a learner, I want to undo deleting a saved exchange, so that a mistaken tap does not lose a phrase.
21. As a learner, I want an undone deletion to put the saved exchange back where it was, so that my list is as I left it.
22. As a learner, I want the chance to undo to stay until I do something else, so that I am not rushed.
23. As a screen-reader user, I want to be told that a saved exchange was deleted and that I can undo it, so that I know the offer to undo is there.
24. As a keyboard user, I want focus to land on the next row after a deletion, as it does now, so that I can carry on through the list.
25. As a learner, I want a deleted exchange that I have since saved again not to be duplicated by undo, so that my list stays clean.

### Everywhere

26. As a keyboard user, I want every control in the chat and the saved exchanges reachable and operable with the keyboard alone, so that I never need a pointer.
27. As a keyboard user, I want to see which control has focus, so that I know where I am.
28. As a screen-reader user, I want every icon button to have a name, so that I know what it does.
29. As a screen-reader user, I want the translate toggle to announce whether it is on, so that I know whether my next message will be answered or translated.
30. As a learner, I want my choice of light or dark theme to keep every fix in this spec, so that accessibility does not depend on the theme.
31. As a maintainer, I want accessibility regressions caught by the test suite where a machine can catch them, so that they do not reach learners unnoticed.

## Implementation Decisions

### Scope

- The target is WCAG 2.2 Level AA, for the chat and the saved exchanges, in both themes. Level AAA criteria are not pursued.
- The secret-phrase screen is excluded, as it is to be removed. Nothing in this spec changes it.
- Text written by the model is content like any other, but its language, reading level and wording are not controlled. A reply in a language other than Catalan, which the model writes only when asked, is of indeterminate language for the purpose of language of parts.

### The offer

- Each reply in the conversation gains a disclosure button beside it, named `Opcions de la resposta`, which reports whether its offer is open with `aria-expanded` and controls the offer with `aria-controls`.
- Tapping the reply still opens and closes its offer, with the same exceptions as now: not on a link, not after a drag that selected text, not while a reply is being written. The reply bubble itself is not made a button, as it may contain links.
- Opening the offer leaves focus on the disclosure button. The offer follows it directly in the tab order.
- Escape, while focus is on the disclosure button or inside the offer, closes the offer and puts focus on the disclosure button.
- Focus leaving both the disclosure button and the offer closes the offer, as a pointer press outside them does now.
- The disclosure button opens an offer under every reply that a tap would open one under. Where a tap does nothing (the reply that is speaking and cannot be saved, or no speech and no exchange) there is no disclosure button. While a reply is being written, every disclosure button is disabled, as tapping does nothing then.
- The saved-exchanges list already uses buttons with `aria-expanded` for its rows and needs no change here.

### Contrast and size

- Text meets 4.5:1 against what is behind it, and large text 3:1. Today the hint and status text at 40% and 50% opacity fails in light mode (about 2.9:1 and 4:1), as does 40% white in dark mode (about 3.8:1). `Pensant…` sits on the tinted reply background and fails too. These are made solid colours that pass.
- `red-600` passes on white but not on the dark background (about 4.1:1). Error text uses a lighter red in dark mode.
- Blue buttons with white text, links in replies, and the pressed translate toggle already pass in both themes.
- The message field's border, the only thing that shows where the field is, meets 3:1 against the background in both themes. Today it is about 1.4:1 in light mode and 1.8:1 in dark mode. Borders that are not the only sign of a control, such as on the icon buttons, are left alone.
- Disabled controls are exempt and keep their reduced opacity.
- Colours are expressed as theme tokens in the global stylesheet, not as opacities scattered through the components, so that a future change is made once.
- Every control is at least 24 by 24 CSS pixels, or spaced so that it meets the spacing exception. The header's icon buttons are 20 pixels square with no padding, so they gain padding.
- The layout reflows at 320 CSS pixels wide and at 200% zoom with no sideways scroll, other than code blocks and tables in a reply, which may scroll on their own.

### Announcements

- The conversation is a `role="log"` region. It is marked `aria-busy` while a reply is being written and cleared when the reply ends, so that the reply is announced once and whole.
- `La IA s'està despertant…` and `Pensant…` are given `role="status"`.
- The cut-short notice is given `role="status"`.

### Language

- Each message in the conversation, and each message in the saved-exchanges list, is marked `lang=""`, meaning unknown. The page stays `lang="ca"`, so replies and the interface are read as Catalan.

### Labels

- The message field gains an accessible name through a visually hidden `<label>`: `Missatge`, or `Text per traduir` while translating. Its placeholder and the adjacent `Envia` button remain the visible instruction.

### Errors

- An error in the conversation is shown as a fixed Catalan message, never the raw error text. The failures known are:
  - The network could not be reached: `No s'ha pogut connectar. Comprova la connexió i torna-ho a provar.`
  - The server or **model host** failed or timed out: `La IA no ha pogut respondre. Torna-ho a provar.`
- Any other failure is shown with the second message.
- The raw error is still logged to the console.
- A `Torna-ho a provar` button follows the message. It clears the error and asks again for the reply to the last message, without the user retyping it. It is absent if there is no message to retry.
- The message and its button are in a `role="alert"` region.

### Undoing a deletion

- Deleting a saved exchange removes it at once, as now, and shows `S'ha suprimit.` with a `Desfés` button at the top of the list, in a `role="status"` region.
- `Desfés` restores the exchange at the place it was deleted from, or at the end if the list has since become shorter than that place.
- The chance to undo has no time limit. It ends when the user deletes another saved exchange, which replaces it, or leaves the list.
- If the deleted exchange has meanwhile been saved again, for example from another tab, `Desfés` changes nothing.
- The storage module gains a way to insert a saved exchange at a given place. As with every other write, it reads the stored list at that moment and applies the one change.
- `Nova conversa` gains no undo. The **conversation** is held only in memory and is not user data in storage.
- This reverses the saved-exchanges spec's decision that deletion has no undo, and its listing of undo as out of scope.

## Testing Decisions

- There is one test seam: the rendered chat, as for saved exchanges. Behaviour is tested by driving the chat with the keyboard and by role and accessible name, as a user of assistive technology would, and asserting on what is on screen and what has focus. The storage module's new insert is covered through undo in the chat, not tested on its own.
- A good test describes something a user of assistive technology can observe: a name, a role, a state such as expanded or busy, where focus is, what is announced. It does not assert on class names, colours or component state.
- The prior art is the existing chat component tests, which already fake the network and the audio player, drive the tap on a reply and use jsdom's real `localStorage`. The new tests extend that file and reuse its helpers, under their own headings.
- Automated checks run `axe-core` against the rendered chat in its main states: before a session, with a conversation, with an offer open, with an error, and showing the saved exchanges with a row open. A test fails on any violation. jsdom does not compute colours, so these checks cannot catch contrast failures.
- Behaviours that must have a test: opening and closing the offer with the disclosure button and `aria-expanded` following it; Escape closing it and returning focus; tabbing away closing it; tap still opening it; no disclosure button where a tap does nothing; the log being busy while a reply streams and not after; the status roles; messages marked `lang=""`; the field's name changing with translate mode; each error message and the retry resending the last message; undo restoring a deleted exchange at its place; a second deletion replacing the undo; leaving the list ending it.
- Contrast, target size, reflow, zoom and screen-reader behaviour are checked by hand before release, using a written checklist kept beside this spec: VoiceOver on iOS Safari and macOS Safari, keyboard only, 200% zoom, 320 pixels wide, and contrast measured in both themes.

## Out of Scope

- Every Level AAA criterion, including 7:1 contrast, 44-pixel targets, user-selected colours, reading level, unusual words and abbreviations, pronunciation, context-sensitive help, section headings, line length, reduced motion and focus appearance.
- The secret-phrase screen.
- Detecting the language of a message.
- Undo for `Nova conversa`.
- A help panel or a bilingual interface.
- Changing the system prompt.

## Further Notes

- AAA was the starting aim and was set aside: much of it applies to replies, which the model writes and the app cannot guarantee, and the rest added work out of proportion to a proof of concept.
- This version of Next.js differs from earlier ones. Read the relevant guide in the installed package's docs before writing code, as the repository's agent instructions require.
