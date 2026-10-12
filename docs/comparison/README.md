# Comparison messages

A fixed set of messages for telling whether one **model host** answers as well as another. The same set is sent each time, and the replies are judged by reading them side by side. Nothing here scores them.

| File | Purpose |
| --- | --- |
| `messages.json` | The messages. Each records whether it is sent as chat or as a translation, and what it is there to cover |
| `replay.mjs` | Sends the set to a running copy of the app and prints the replies as Markdown |
| `baseline-runpod.md` | RunPod's replies, taken on 2026-10-12 with the app sending a temperature of 1 and a top-p of 1 |

## Replaying the set against a host

1. Point the app at the host: set `MODEL_HOST_URL` and `MODEL_HOST_API_KEY` in `.env.local`, and start it with `npm run dev`.
2. Make sure the host is awake, or the first message waits through a cold start.
3. Run the script from the repository root, naming the host, and keep what it prints:

   ```bash
   node --env-file=.env.local docs/comparison/replay.mjs "Cloud Run" > docs/comparison/replies-cloud-run.md
   ```

The script unlocks the app with `CHAT_SECRET_PHRASE` and sends each message on its own through `/api/chat`, so a message takes the same path as one a learner enters: the same prompts, stop sequences and sampling values. Set `APP_URL` to replay against a copy of the app that is not at `http://localhost:3000`.

## Reading the replies

Replies are sampled, so two runs against the same host differ in wording. Compare how well they read, not whether they match:

- A chat reply is in Catalan, unless the message asked for another language.
- A translation renders the message and does not answer it.
- A translation keeps a sign-off that was in the text.
- A chat reply does not end in a sign-off of the model's own, such as "Salutacions".
- Token counts arrive with every reply.
