# 01 — Features that help a learner learn

**What this is:** a list of features that could make the app better at teaching Catalan, not yet a plan for any of them. Today the app is a chat: it replies in Catalan as a teacher would, translates on request, speaks replies and saves exchanges. What it lacks is a way for the learner to practise, be corrected, and come back to what they have seen. Each idea below says why it helps a learner and what in the app it would build on. Any of them that is taken up gets its own folder and tickets.

**Status:** ideas, none started.

**Blocked by:** none.

## The ideas

### 1. Review saved exchanges with spaced repetition

Turn the saved exchanges into cards: show the reply and ask for its meaning, or show the message and ask for it in Catalan. Schedule the next review by how well the learner recalled it (SM-2 or FSRS).

- **Why:** recalling something at growing intervals is one of the best-supported results in learning research. Without review, the saved list is collected and rarely read.
- **Builds on:** `src/lib/saved-exchanges.ts`. Each record gains a due date and an ease; it all stays in `localStorage` and offline.

### 2. Correct what the learner writes in Catalan

When the learner writes in Catalan, the teacher restates their sentence correctly before answering, without stopping the conversation (a recast). A small "Correcció" note under it shows what changed, such as an agreement or a tense.

- **Why:** feedback on the learner's own output is what turns chatting into learning.
- **Builds on:** the translation mode in `src/lib/chat.ts` and `src/lib/model-host.ts`. The model is too small to judge its own work reliably inside the chat, so this should be a narrow, separate request that sends only the learner's sentence and asks for a correction.

### 3. Listen first, then read

A mode where a reply plays before its text is shown, with a "show text" button. A slower speaking rate for beginners, and tapping one word speaks only that word.

- **Why:** catching what was said before reading it builds listening skill, usually a learner's weakest. Catalan pronunciation (vowel reduction, *ll*, *ix*, *tx*) is hard to learn from text alone.
- **Builds on:** `/api/speak` and `VOICE_SETTINGS` in `src/lib/tts.ts`, which already holds the speaking rate.

### 4. Replies pitched at the learner's level

The learner picks a CEFR level, A1 to B2, and the system prompt sets vocabulary, sentence length and tenses to match. For example, A1 keeps to the present tense and common words; B1 adds the *perfet* and *imperfet* and idioms.

- **Why:** input just above the learner's level is what moves them forward. One prompt for everyone is too hard for a beginner and too easy for an intermediate learner.
- **Builds on:** `SYSTEM_PROMPT` in `src/lib/model-host.ts`, and one new setting.

### 5. Tap a word to look it up and save it

Tapping a word in a reply shows its meaning, its base form (*vaig anar* → *anar*) and its gender, with a button to save it as a card for review (idea 1).

- **Why:** saving one word is more precise than saving an exchange, and the learner builds a vocabulary of their own while reading.
- **Builds on:** a short, narrow prompt to the model. A real dictionary would be more reliable, such as Optimot, the Institut d'Estudis Catalans dictionary, or an AINA Kit resource, if one has an API that can be used.

### 6. Role-play scenarios

A few set situations, such as ordering at a café, asking for directions in Barcelona, or seeing a doctor. The model plays a character, a waiter or a pharmacist, instead of the teacher. Each scenario has a goal ("get a table for two and ask what's in the *pa amb tomàquet*"), and the model says when it is met, which ends the scene.

- **Why:** practising for real situations motivates learners and teaches the phrases they will use. A finished goal is a clear win.
- **Builds on:** a system prompt per scenario. A short, focused prompt suits a 7B model better than open chat.

### 7. Speaking practice with speech recognition

A microphone button turns the learner's spoken Catalan into text and sends it as a message. If the transcript differs from what they meant to say, their pronunciation needs work. For a guided drill, show a sentence, let the learner read it aloud, and mark the words the recogniser got wrong.

- **Why:** today the learner only listens. Speaking is the skill a chat practises least.
- **Builds on:** a second speech service beside Matxa-TTS, behind its own route like `/api/speak`. Fine-tuned Catalan Whisper models exist; AINA Kit is the place to look.

### 8. Choice of dialect

The learner picks Central (Barcelona), Valencian or Balearic, which differ in vocabulary, verb forms and pronunciation. A learner moving to Valencia needs *xiquet*, not *nen*.

- **Why:** learners learn a variety for a place, and few Catalan learning tools offer the choice.
- **Builds on:** Matxa-TTS v2 is multi-accent, so the voice in `VOICE_SETTINGS` could follow the choice, and the system prompt could ask for that variety's words and forms.

### 9. End-of-session summary

When the learner presses "Nova conversa" or leaves, show a short summary of the session: the new words and expressions that came up, the corrections from idea 2, and one grammar point that came up more than once. Each item can be saved with one tap.

- **Why:** looking back over a session helps it stick, and turns a chat that disappears into something the learner keeps.
- **Builds on:** the conversation is already in the browser, so this is one more narrow request to the model.

### 10. Exercises made from the learner's own conversations

Take sentences from earlier conversations and saved exchanges and turn them into short exercises: a word hidden for the learner to fill in (*Ahir \_\_\_ (anar) al mercat*), a verb to give in a person and tense, an adjective to make agree with its noun.

- **Why:** exercises built from sentences the learner has already seen are easier to relate to than a textbook's.
- **Builds on:** the saved exchanges. The app picks the sentences and checks the answers itself, and asks the model only which word to hide, so grading stays reliable on a small model.

## Where to start

Spaced repetition (1) first: the saved exchanges and their storage already exist, so it needs the least new work and makes an existing feature useful. The end-of-session summary (9) pairs with it, collecting what to remember for review, which gives the app a loop of chat, summary and practice.
