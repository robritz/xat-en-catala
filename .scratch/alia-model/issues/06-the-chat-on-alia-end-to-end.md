# 06 — The chat on ALIA, end to end

**What to build:** The chat running on ALIA, seen from the learner's side. With `MODEL=alia`, a **session** starts, the first **message** is held through ALIA's **cold start**, and **replies**, **translations**, replies pitched at a **tier** and the cut before a sign-off all work. Switching back to Salamandra works as well. This checks that things work, not how good the replies are; judging ALIA against Salamandra is the owner's and out of scope.

See `docs/specs/alia-model.md`, user stories 10 to 15.

**Needs the owner:** Pointing the hosted app at ALIA serves every learner from ALIA. Do this against a local or preview run of the app unless the owner says otherwise.

**Blocked by:** 01 — The app chooses its model with one setting; 05 — A merge deploys ALIA.

**Status:** checked; three criteria not met, recorded below for the owner

- [x] With `MODEL=alia` and ALIA's variables set, opening the chat from zero instances wakes ALIA, shows the usual wait, and delivers the greeting without the route timing out.
- [ ] A message gets a streamed reply in Catalan with its token counts.
- [x] With translation on, a message gets a translation into Catalan and not an answer.
- [ ] With a beginner's **learner profile**, a reply includes an explanation in the native language, as the tier's rules ask.
- [ ] A reply that would end in a sign-off is cut before it, and the request carrying the stop sequences does not fail or come back empty.
- [x] With `MODEL` unset again, the chat replies from Salamandra.
- [x] Anything ALIA gets wrong that the shared prompts or stop sequences cause is recorded in this ticket for the owner, not fixed here.

## Outcome

Checked on 2026-11-08 against `next dev` on this machine. `MODEL=alia` and ALIA's variables were set in the environment, and the hosted app was left on Salamandra. Requests went through the chat route as the browser sends them, by a script that unlocks the chat and posts UI messages. The browser itself was not driven, so the usual wait was not seen. It is inferred: the wait and the spinner are the same code whichever model replies.

The plumbing works:

- **Session start from zero.** The greeting prompt, with a beginner's profile, started a new ALIA instance. The first text came after 16.6 seconds, and the stream finished after 18.2 with its token counts (144 in, 52 out).
- **Token counts.** Every reply that ended on its own closed with them, and the route logged its `reply_tokens` line.
- **Translation.** "Where do you live? I live near the sea." came back as "On vius? Jo visc a prop del mar.", a translation and not an answer.
- **Stop sequences.** No request failed or came back empty because of them. The three that failed did so for the reason in finding 1.
- **Switching back.** With `MODEL` unset, the chat replied from Salamandra, which woke in 10 seconds.

The unticked boxes are not met. What ALIA gets wrong, none of it fixed here:

ALIA was sent 9 requests in all: the greeting; "What did you have for breakfast today?"; the translation; "Què vol dir 'bon profit'?" with a Spanish A1 profile, twice; a short letter ending in "Salutacions"; "Com es diu 'thank you' en català?" with an English A1 profile; "Where is Barcelona?"; and a short email to a doctor.

1. **Runaway replies.** 3 of the 9 requests repeated themselves without end until the route's 180 seconds cut them off. The learner then sees "Upstream error" under a reply that has been growing for three minutes. They were "Què vol dir 'bon profit'?" with a Spanish A1 profile, "Com es diu 'thank you' en català?" with an English A1 profile, and "Where is Barcelona?" with no profile. One repeated a paragraph with a growing count ("Totes vint-i-cinc expressions són correctes…"). Another listed "The Catalan word for … is …" for every word. The model host cancelled each when the route let go, after about 5,700 tokens, so the GPU did not go on generating. Asked again, the Spanish A1 question ended on its own after 312 tokens. ALIA's sampling (temperature 0.1, top-p 1, no repetition penalty, as BSC advises), the shared prompt and the absence of any cap on a reply's length may each play a part.
2. **Replies in English.** With no profile, ALIA answered English questions in English ("I had some bread with tomato…", "Barcelona is a city in Catalonia…"), not in Catalan.
3. **A beginner's explanation in Catalan.** With a Spanish A1 profile, both explanations of "bon profit" were in Catalan, not in Spanish. With an English A1 profile, the greeting was followed by a full English version in brackets rather than one word explained.
4. **Sign-offs not cut.** ALIA ends letters with Markdown around the sign-off (`*Salutacions,`) or with another one ("Atentament,"), which `SIGN_OFFS` (`"\nSalutacions"`, `" Salutacions"`, `"(fi)"`) does not match. Neither was cut. In ticket 04, outside this check, it also signed a reply "De la teva amiga inquieta, Pandora".
5. **Markdown and a Spanish question mark.** ALIA formats with Markdown (`**…**`, `*…*`) and once opened a question with "¿". The chat shows both as typed.

Seen on the way:

- **Strangers can wake ALIA.** A `python-requests` client sent `GET /` to ALIA's public URL at 13:56. Its 404 still started an instance, which then stayed up for its idle period. Anyone who finds the URL can wake the RTX PRO 6000, which costs about $3.19 an hour while an instance is up, by the Cloud Billing catalog's rates for `europe-west4`. This is not caused by the prompts and is outside this ticket.
