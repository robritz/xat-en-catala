# Onboarding

Terms in **bold** on first use are defined in `CONTEXT.md` at the repository root. Use them as defined there.

**Status:** ready-for-agent

## Problem Statement

Every learner gets the same teacher. The model writes every **reply** in the same Catalan whoever is reading it, and explains words and expressions in Catalan too. A learner who has just started cannot read the reply, and cannot read the explanation meant to help them with it either, so the help comes in the one language they don't yet understand. A learner who is nearly fluent gets simplified Catalan and explanations they don't need. The app knows nothing about either of them, so it cannot pitch a reply to the person reading it.

## Solution

On a first visit, after the secret phrase, the app asks two questions before the **session** starts: which language the learner reads best, their **native language**, and how well they know Catalan, their **level**, from A1 to C2. Together these are the **learner profile**. It is kept on the learner's device, and a returning learner is not asked again.

Every reply after that is pitched at the learner's level. Replies stay in Catalan. At A1 and A2, a reply keeps to short sentences and common words, and explains one word or expression in the learner's native language. From B1 up, explanations are in Catalan, and fewer as the level rises. The greeting that starts the session is pitched the same way. A **translation** is unchanged.

A button in the header shows the learner's level. Tapping it asks the two questions again, so a learner who has moved up a level can say so without losing the **conversation**.

## User Stories

### Onboarding

1. As a first-time learner, I want to be asked which language I read best once I've entered the secret phrase, so that the app can explain Catalan to me in a language I understand.
2. As a first-time learner, I want each native language listed in its own language (English, Español, Euskara, Galego, Français, Deutsch), so that I can find mine without reading Catalan.
3. As a first-time learner, I want the question about my native language to be readable before I've chosen one, so that I'm not stuck on the first screen.
4. As a first-time learner whose language isn't listed, I want to pick the listed language I read best, so that I still get explanations I can follow.
5. As a first-time learner, I want the question about my level asked in the language I just chose, so that I can understand what I'm being asked.
6. As a first-time learner, I want each level from A1 to C2 described in one line, in my language, so that I can judge which one is mine without knowing the CEFR scale.
7. As a first-time learner, I want to go back from the level question to the native language question, so that I can fix a wrong choice before I start.
8. As a first-time learner, I want finishing onboarding to start the session, so that I wait for the model to wake once, not twice.
9. As a first-time learner, I want the usual waking spinner once I've finished onboarding, so that I know the app is working on my first reply.
10. As a first-time learner, I want onboarding to take only two choices, so that I can start chatting quickly.
11. As a learner, I want onboarding to appear only after the secret phrase, so that a visitor who doesn't know the phrase sees nothing more than before.
12. As a learner, I want to open my **saved exchanges** during onboarding, as I can before the session starts today, so that onboarding never stands between me and phrases I've kept.

### Returning

13. As a returning learner, I want my learner profile remembered on this device, so that I'm not asked the same questions on every visit.
14. As a returning learner, I want the usual "Iniciar la sessió" button when my profile is already known, so that starting is as quick as it was before.
15. As a returning learner whose stored profile has been lost or can't be read, I want to be taken through onboarding again, so that the app never guesses who I am.
16. As a learner whose browser refuses to store my profile, I want the session to start anyway with the profile I chose, so that a storage problem doesn't stop me chatting.
17. As a learner whose browser refuses to store my profile, I want to be asked again on my next visit, rather than shown an error, so that the failure costs me only two taps.
18. As a learner on a second device, I understand that my profile isn't there, so I'll answer the questions again on it, as I would expect with saved exchanges.

### Replies at my level

19. As an A1 or A2 learner, I want replies in short sentences, in the present tense, with common words, so that I can read them.
20. As an A1 or A2 learner, I want one word or expression in each reply explained in my native language, so that I learn something from every reply I can't fully read.
21. As an A1 or A2 learner, I want the rest of the reply to stay in Catalan, so that I'm still reading Catalan rather than my own language.
22. As a B1 or B2 learner, I want replies in everyday Catalan, using past tenses and common idioms, so that I'm stretched without being lost.
23. As a B1 or B2 learner, I want words that are likely to be new to me explained in Catalan, so that I stay immersed.
24. As a C1 or C2 learner, I want natural, unsimplified Catalan with no explanations unless I ask, so that the replies read like talking to a native speaker.
25. As a learner at any level, I want replies to stay in Catalan unless I ask for another language, so that I keep practising.
26. As a learner at any level, I want the greeting that starts my session pitched at my level, with any explanation in the right language, so that the first reply is one I can read.
27. As a learner at any level, I want a translation to be exactly what I entered rendered in Catalan, whatever my level, so that I can rely on it as I do today.
28. As a learner who chose French or German, I want explanations in my language that are as good as those in the other languages, so that I'm not given a worse teacher for my choice.

### Changing my profile

29. As a learner, I want my level shown in the header, so that I can see at a glance what the app thinks my level is.
30. As a learner, I want to tap the level in the header to answer the two questions again, so that I can tell the app when I've improved.
31. As a learner who changes my profile, I want the change to apply from my next message, so that I don't have to start over.
32. As a learner who changes my profile, I want my conversation kept as it was, so that I don't lose what I've been reading.
33. As a learner who opens the questions and changes my mind, I want to close them without changing anything, so that a mis-tap costs nothing.
34. As a learner who changes my profile while a reply is still being written, I want that reply finished as it began and the next one to use my new profile, so that nothing is cut off.
35. As a learner who changes my profile, I want it remembered for my next visit, so that I'm not put back to my old level.

### Accessibility

36. As a screen reader user, I want the header button announced as "Perfil d'aprenent, nivell B1" (with my level), so that I know what it shows and what it opens.
37. As a screen reader user, I want each onboarding question to be a labelled group of choices, so that I hear the question and every option.
38. As a screen reader user, I want each native language option marked with its own language, so that it's read with the right pronunciation.
39. As a keyboard user, I want to complete onboarding and edit my profile with the keyboard alone, so that I don't need a pointer.
40. As a keyboard user, I want focus moved to the level question when it appears, and back to the header button when I close the questions, so that I don't lose my place.
41. As a mobile user, I want the choices large enough to tap and the screen usable above the on-screen keyboard, so that onboarding works on my phone as the chat does.

### Privacy and safety

42. As a learner, I want my profile kept only on my device, so that nothing about me is stored on a server.
43. As the owner, I want the browser to send only fixed codes for the profile, never prompt text, so that nothing a visitor types or tampers with can reach the model's instructions.
44. As the owner, I want a request with a missing or unknown profile to get today's prompt, so that an old tab or a tampered request still gets a sensible reply.

## Implementation Decisions

### The learner profile

- A learner profile is a native language and a level, both from fixed lists:
  - Native languages, by code: `en` (English), `es` (Español), `eu` (Euskara), `gl` (Galego), `fr` (Français), `de` (Deutsch). Catalan is not offered.
  - Levels: `A1`, `A2`, `B1`, `B2`, `C1`, `C2`.
- The browser module that reads and writes saved exchanges is the model for a new one that reads and writes the profile. It is stored in `localStorage` under its own key, `learner-profile`, as `{ version, nativeLanguage, level }`.
  - Anything missing, unparseable, of another version, or with a value outside the lists is read as no profile.
  - A write that the browser refuses is not reported to the learner. The profile is held in memory for the rest of the visit.

### What the server does with it

- Each request to `POST /api/chat` carries the profile in the body beside the messages, as `profile: { nativeLanguage, level }`. The browser sends it with every request, the greeting included, from the profile it holds at the moment of sending.
- The server checks both codes against its own lists. If either is missing or unknown, the request is answered with today's system prompt, unchanged.
- The six levels map to three tiers on the server: A1–A2, B1–B2 and C1–C2. The model is too small to tell neighbouring levels apart reliably, and the learner still chooses from the scale they know.
- The model module builds the system prompt from the profile: today's teacher prompt, its rule that explanations are in Catalan replaced with the tier's instructions. Its rule about not using another language unless asked stays for the rest of the reply.
  - **A1–A2:** short sentences, the present tense and common words; one word or expression per reply explained in the native language, named in the prompt by its English name.
  - **B1–B2:** everyday register, the *perfet* and *imperfet* and common idioms; explanations in Catalan only for words likely to be new.
  - **C1–C2:** natural, unsimplified Catalan, including idiomatic and regional expressions; no explanations unless the learner asks.
- All prompt text lives on the server. The browser never sends any.
- A translation request ignores the profile and uses the translation prompt as today.
- The `reply_tokens` log line gains the level's tier, so the length of replies can be compared across tiers.

### Onboarding

- Onboarding appears after the secret phrase, in place of the `Iniciar la sessió` button, when no profile is stored. With a profile stored, the start button shows as today.
- It is two steps:
  1. The native language question, with each option in its own language. Its heading is in Catalan with English beneath it, as the language that a learner without Catalan is most likely to read.
  2. The level question, in the native language just chosen, with a one-line description of each level based on the Council of Europe's CEFR self-assessment wording. A back control returns to step 1, and a start button finishes.
- Finishing writes the profile, then starts the session as the start button does today: it sends the hidden greeting message and shows the waking spinner until the greeting arrives.
- The interface text that onboarding needs, the level question, the level descriptions and the controls, is held in each of the six languages. It is the only part of the interface that is translated.
- The `Desats` button works during onboarding as it does before the session starts today.

### Editing the profile

- Once a profile exists and the chat is unlocked, the header shows a button labelled with the level, such as `B1`, whose accessible name is `Perfil d'aprenent, nivell B1`.
- It opens the same two questions with the current answers chosen. Saving writes the profile; closing without saving changes nothing.
- A change applies to the next request. A reply being written when it is made is not affected, and the conversation is kept.
- `Nova conversa` keeps the profile.

## Testing Decisions

- A good test drives the feature from outside and checks what a learner, or the model, would see: what the screen shows, what is stored, what is sent, and what instructions the model receives. It does not reach into internal state or check how the prompt is put together.
- **The chat route**, in the existing route tests with the mocked model. They check the instructions the model receives for:
  - one profile in each tier, including that A1–A2 names the native language and higher tiers do not;
  - a missing profile, an unknown native language and an unknown level, which all get today's prompt;
  - a translation with a profile, which gets the translation prompt;
  - the greeting with a profile;
  - the tier in the `reply_tokens` log line.
- **The chat UI**, in the existing chat tests with React Testing Library, a stubbed `fetch` and real `localStorage`. They check that:
  - onboarding appears after unlocking with no profile, and not before;
  - the level question appears in the chosen language, and back returns to the first question;
  - finishing stores the profile and starts the session, and the greeting request carries it;
  - a stored profile shows the start button instead, and every request carries it;
  - stored data that is unparseable, of another version, or out of range leads to onboarding;
  - a refused write still starts the session, and requests carry the profile;
  - the header button shows the level and its accessible name, and editing changes what the next request carries, keeps the conversation and is stored;
  - closing the questions without saving changes nothing;
  - focus moves as described, and every choice is reachable by keyboard.
- Prior art: the route tests that check the translation prompt is used for translation requests, and the chat tests for saved exchanges, which already cover storage that can't be read or written.

## Out of Scope

- Native languages beyond the six listed, and free text for a native language.
- Translating the rest of the interface, which stays in Catalan.
- A placement test, or the app suggesting a level from how the learner writes.
- Changing the level automatically over time.
- Syncing the profile across devices, or storing it on a server.
- Dialects (Central, Valencian, Balearic), which are idea 8 in `.scratch/future-ideas/issues/01-features-that-help-a-learner-learn.md`.
- Corrections of the learner's Catalan, which are idea 2 there.

## Further Notes

- **French and German must be checked before they ship.** The model is tuned for Catalan, Spanish, Basque, Galician and English only. Replay a handful of messages through the comparison set in `docs/comparison/` with A1 profiles in French and German, beside one in English, and read the explanations. If either language's explanations are wrong or drift out of that language, remove it from the list before merging. The weakness matters only at A1–A2, since higher levels explain in Catalan, but those are the learners who depend on the explanation most.
- **The tiers' wording needs the same check:** replay the same messages at each tier and confirm the replies differ in length and difficulty as intended.
- The level descriptions are drafted from the CEFR self-assessment grid. The French, German and Basque should be checked by a native speaker before merging.
- This replaces idea 4, "Replies pitched at the learner's level", in the future ideas ticket.
- The work splits into three tickets, in `.scratch/onboarding/issues/`: the profile and tiers on the server, which can be merged first; onboarding and storage; and editing from the header.
