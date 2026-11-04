# 01 — Close the gaps the first mutation run found

**What to build:** Tests that catch the changes Stryker made which no test failed on. The first run of `npm run test:mutation` (PR #53) scored 78.8%: of 1,663 changes, 320 survived and 33 were in code no test runs. The tests should fail when the code's behaviour changes. Where a change cannot alter behaviour, or alters nothing worth a test, the line is marked so Stryker skips it, with the reason beside the mark. Then the config gets a minimum score, so the score cannot fall without someone seeing it.

Line numbers below are from the run on `7c62e40`. Run Stryker again before starting, as they may have moved. The report, `reports/mutation/mutation.html`, lists each surviving change in place.

**Blocked by:** none. PR #53, which adds Stryker, should be merged first.

**Status:** not started

## The gaps, most important first

### Behaviour the server and the stored data depend on

- **`src/lib/unlock.ts`**
  - The cookie's `secure` flag can be changed with no test failing. A test that sets `NODE_ENV` to `production` should see a secure cookie, and one that doesn't should see a cookie that isn't.
  - The cookie's one-year max age (line 7) can be changed too.
  - The phrase's case and spacing can be changed (line 11), so no test proves that a phrase typed in capitals or with extra spaces still unlocks.
- **The API routes**
  - None of `chat`, `speak` or `unlock` is tested with a body that is not JSON. Each catches the parse error and answers as for an empty body, but `.catch(() => null)` can become `undefined` with no test failing.
  - `speak` allows text up to `MAX_SPEECH_LENGTH`, but nothing tests text of exactly that length, so `>` can become `>=`.
  - `speak` falls back to `audio/wav` when the TTS server sends no `Content-Type`. No test runs that.
  - The `speak/health` route's response bodies are not checked.
  - The `chat` route doesn't count tokens unless both input and output counts are known. Nothing tests a reply where only one is known, so `||` can become `&&`.
- **`src/lib/saved-exchanges.ts`**
  - Saving an exchange that is already saved should leave the list as it is. The duplicate check (line 91) can be removed with no test failing.
  - A stored list with one bad entry should be thrown away, but `every` can become `some` (line 27).
  - Corrupt stored JSON (line 42) and nothing stored (line 24) aren't tested either.
- **`src/lib/learner-profile.ts`**: corrupt stored JSON (line 67) and a profile stored under another version (line 48) are not tested.
- **`src/lib/chat.ts`**: messages with parts that are not text, parts that are `null`, and a value that is not an array (lines 9, 24, 36) are not tested.
- **`src/lib/model-host.ts`**
  - The request sends `SIGN_OFFS` as stop sequences, but no test checks they are sent: the list can be emptied.
  - Every sentence of the system prompts can be emptied without a test failing: the reply rules, each level's instructions and the translator's. One test per level that the prompt holds that level's instructions is enough. Don't copy the whole prompt into the test.
- **`src/lib/tts.ts`**: a `TTS_API_URL` ending in more than one slash is not tested (line 20).
- **`src/lib/token-usage.ts`**: resetting usage that is already empty (line 67) is not tested.

### How numbers and text are read aloud (`src/lib/speech-text.ts`, 35 survived)

- **Numbers:**
  - nothing tests the tens words beyond the first few, or the numbers ten to nineteen (lines 12 and 14);
  - nothing tests a number of exactly 12 digits, a run of digits that starts with a zero (line 49), or a thousands number whose first group has more than one digit, such as `12.345.678` (lines 56 and 59);
  - nothing tests decimals with more than one digit, or decimals with leading zeros such as `0,05` (lines 63 and 64; line 64 is not run at all);
  - nothing tests a number with a gap in the middle (line 42).
- **Text:**
  - the markdown marks: `##` headings and list markers with more than one space after them (line 87);
  - `http://` links as well as `https://` (line 90);
  - a currency sign followed by a space, such as `€ 5` (line 94);
  - letters spelled out one by one (line 100);
  - the space removed after `(` (line 104).

### The chat screen (`src/app/chat.tsx`, 161 survived)

Most of these are conditions that are never tested from both sides:

- **The send button** is disabled while a reply is loading, while the input is disabled, or while the message is only spaces (line 817). Each condition should be tested alone.
- **Offers:**
  - Escape closes an offer only on its own reply (line 668);
  - moving focus out of a reply closes its offer, and moving it within the reply doesn't (line 675);
  - a click outside an offer closes it (lines 287 to 292).
- **Listening:**
  - a listen status updates only the offer or saved row it belongs to (lines 386 and 393);
  - when the sound ends, the speaking mark clears (line 374);
  - a second press stops the sound (line 358);
  - the audio's object URLs are released (lines 273 and 369).
- **Moving between the chat and the saved list:** the chat's scroll position is kept and restored (lines 213, 214 and 450), and focus goes back to the profile button after the profile is closed (lines 219 to 221).
- **What is shown:**
  - onboarding appears only when there is no profile and nothing is loading (line 636);
  - the empty-chat prompt appears only once the chat has started and has no messages (line 647);
  - the cut-short notice appears only under the last message (line 752);
  - a click that ends a text selection doesn't open an offer (line 687).
- **The on-screen keyboard:** the effect that follows the visual viewport (lines 227 to 243) is not run by any test.

The rest are the strings for class names and headers in this file (44 survived), covered under "Changes to skip" below.

### The other screens

- **`src/app/onboarding.tsx`** (18 survived):
  - Escape closes the dialog only when it can be closed (line 77);
  - focus moves to each new question (lines 57 to 66);
  - the form is not submitted without a level (line 168).
- **`src/app/saved-exchanges.tsx`** (11 survived): failing to delete an exchange (line 77), and where focus goes after a delete (line 69).
- **`src/app/onboarding-text.ts`** (37 survived): any of the texts can be emptied without a test failing. One test that every text is non-empty in every learner language catches all of them, and it also catches a language added later with a text missing.

### Changes to skip, with the reason beside each

Some changes can't alter behaviour, or alter only things no test should pin down. Mark each one with `// Stryker disable next-line <mutator>: <reason>`, as for a hadolint rule switched off in the Dockerfile:

- class names, SVG paths, `console.error` calls and the `"Stryker was here"` dependency arrays of effects that run once;
- `?.` on values that are never empty where the code runs them;
- `src/app/layout.tsx` and `src/app/page.tsx`, which hold metadata and one line of layout. Either leave them out of `mutate` in `stryker.config.mjs`, with a comment, or give them a test that renders them.

## Done when

- [ ] Each gap listed above has a test that fails if the code is changed as Stryker changed it, or is marked to be skipped with a reason.
- [ ] No test was written only to raise the score: each one checks behaviour a user or a caller depends on.
- [ ] A new run leaves no surviving or untested changes that are not marked, or the ticket says why any are left.
- [ ] `stryker.config.mjs` sets `thresholds.break` a little below the new score, so a run that falls below it fails.
- [ ] The README names `npm run test:mutation` beside the other npm scripts, and says what the score means and where the report goes.
- [ ] The owner decides whether the mutation run joins CI, for example as a weekly run or as a check that changes only the files a pull request touches. A run of the whole app takes about 9 minutes. The decision is recorded here.
