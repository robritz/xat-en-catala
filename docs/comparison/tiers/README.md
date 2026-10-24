# Replies at each tier, and in French and German

The comparison set's seven chat messages, replayed through the app against Cloud Run on 2026-10-24 with a learner profile on each message: English at A1, B1 and C1, and French and German at A1. One run each, at the app's temperature of 1, so each reply is one sample. They were taken for ticket 05 of onboarding, to check that the tiers and the two native languages the model wasn't tuned for work as the spec intends.

| File | Profile |
| --- | --- |
| `replies-en-A1.md` | English, A1 |
| `replies-en-B1.md` | English, B1 |
| `replies-en-C1.md` | English, C1 |
| `replies-fr-A1.md` | French, A1 |
| `replies-de-A1.md` | German, A1 |

Each was made with, for example:

```bash
APP_URL=http://localhost:3000 PROFILE=fr:A1 node --env-file=.env.local docs/comparison/replay.js "Cloud Run" > docs/comparison/tiers/replies-fr-A1.md
```

## What was found

**French and German explanations don't hold up.** Across seven replies each, the A1 prompt asks for one word or expression explained in the native language:

- French: no explanation is in French. Some are labelled "Explanation in French" but written in Catalan. The goodbye reply promises French explanations and gives a garbled French sentence.
- German: no explanation is in German. They are in English or Catalan, and two make up claims about German words ("achsen", "Verfuscht").
- English, for comparison, gets English glosses in most A1 replies (*"Escric" = I write*).

**The tiers differ, roughly as intended.** A1 replies are mostly short, in the present tense, with English glosses. B1 replies are the longest and use past tenses. C1 replies read most naturally and mostly don't explain.

**The tier prompts leak into the replies.** At every tier, replies end with a note about how they followed the instructions, such as "(Short, present tense, common words.)", "(Resposta amb català quotidià, temps passat útil (perfet)…)" or "(Natural, concise, and frame the reply with the student's context as an advanced learner.)". That breaks the prompt's "Do not tell the student about these rules." At B1 the model also talks about the imperfet as a topic, because the prompt names it.

**Some Catalan is wrong.** "Merci beaucoup" comes back as "gràcies molt" at A1, B1 and C1; the run without a profile, in `../replies-cloud-run.md`, gives the right "Moltes gràcies". One sample isn't enough to say the tier prompts cause it.

## Recommendation

- Remove French and German from the native languages, as the spec says to when their explanations don't hold up.
- Reword the tier prompts so they describe the reply to write rather than the student or the grammar: no "The student is a beginner", no *perfet* or *imperfet*. Then replay the set at each tier to see whether the notes about the rules go.
- Replay each profile more than once before judging accuracy, since a single sample at a temperature of 1 is noisy.

Nothing here has been changed in the app yet. The owner decides what stays.
