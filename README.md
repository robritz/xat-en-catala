# Xat en català

A proof-of-concept chatbot that replies in [Catalan](https://en.wikipedia.org/wiki/Catalan_language), no matter which language you write in, to help aid in learning the language. It switches to another language only when you ask it to, and translates what you write into Catalan while the translation toggle is on. It's a Next.js app built on the [Vercel AI SDK](https://ai-sdk.dev) that talks to a model hosted on a [RunPod serverless](https://docs.runpod.io/serverless/overview) vLLM endpoint running [Salamandra 7B Instruct](https://huggingface.co/BSC-LT/salamandra-7b-instruct-2606).

<img width="386" height="678" alt="image" src="https://github.com/user-attachments/assets/386b9a16-38ae-4f66-8f30-8f763b23c5d3" />


## Model and AINA Kit

[Salamandra](https://huggingface.co/BSC-LT/salamandra-7b-instruct-2606) (`BSC-LT/salamandra-7b-instruct-2606`) is an instruction-tuned language model from the Language Technologies Laboratory at the Barcelona Supercomputing Center (BSC). It supports Catalan, Spanish, Basque, Galician and English, and is released under the Apache 2.0 license.

[AINA Kit](https://langtech-bsc.gitbook.io/aina-kit) is BSC's collection of open models and datasets for building AI products and services in Catalan. It's a good place to look for other Catalan models and resources to use with or alongside this app.

## Getting started

Requires Node.js 22+.

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Open http://localhost:3000.

| Variable             | Description                                                     |
| -------------------- | --------------------------------------------------------------- |
| `MODEL_HOST_URL`     | Base URL of the model host's OpenAI-compatible API. For RunPod, `https://api.runpod.ai/v2/<endpoint id>/openai/v1` |
| `MODEL_HOST_API_KEY` | The key the model host checks. For RunPod, an API key with access to the endpoint |
| `CHAT_SECRET_PHRASE` | Phrase users must type to unlock the chat (see below)           |
| `MODEL_NAME`         | Optional. The name the model host serves the model under, if it isn't `BSC-LT/salamandra-7b-instruct-2606` |
| `TTS_API_URL`        | Optional. Base URL of the [Matxa-TTS API](https://github.com/robritz/matxa-tts-api) that speaks replies (see below). Defaults to `http://localhost:8000` |

All are read only on the server, so the API key never reaches the browser. Pointing the app at another model host is a change of these variables alone. `.env.local` is git-ignored.

## How it works

```
Browser ──POST /api/chat──▶ Next.js ──POST <MODEL_HOST_URL>/chat/completions──▶ Model host (RunPod)
        ◀── UI message stream ──    ◀── OpenAI-format token stream ───────────
```

- The browser uses the AI SDK's `useChat` hook, which sends the whole conversation on every message. The server keeps only the user and assistant text, adds the system prompt, and calls the model with `streamText` through the model host's OpenAI-compatible API.
- The toggle button to the left of the input switches translation on and off. While it is on, what you enter is translated into Catalan as-is instead of answered, e.g. "Where do you live?" gets "On vius?"; while it is off, it is handled as a normal chat message. The browser marks such a message in its metadata, and the server sends only that text to the model, without the rest of the conversation, with a translation prompt in place of the usual system prompt. The model is too small to tell a text to translate from one to answer from the system prompt alone.
- Every request carries a temperature of 1 and a top-p of 1, set in `src/lib/model-host.ts`. They are what RunPod applied when it was sent none, and sending them asks any other model host for the same thing.
- The reply is streamed back and shown as it is written. Until the first words arrive, the UI shows "Pensant…".
- The model reads at most 8,192 tokens of conversation and reply together on the Cloud Run model host. A reply that runs into that limit is cut off where it stands, and the UI says so under it and suggests a new conversation. A conversation that is already over the limit gets no reply, only "Error: Upstream error".
- Each reply ends with the tokens the model read and wrote for it, as the model host counted them. The browser keeps a running count for the conversation, which any component can read with `useTokenUsage`: how long the conversation is, which is what fills the model's context window, and the totals read and written. "Nova conversa" starts the count afresh. Nothing shows it yet.
- The server logs the same counts for each reply as one line of JSON, e.g. `{"event":"reply_tokens","inputTokens":212,"outputTokens":48,"translation":false}`. It shows in the `next dev` terminal and in your host's logs, where it can be filtered by `reply_tokens`.
- The RunPod endpoint scales to zero when idle. **The first request after idle time can take about 3–4 minutes** while a worker starts, and the request stays open for all of that time. To absorb that wait up front, each page load begins with an "Iniciar la sessió" button. It sends a hidden message to wake the model, asking it to say hello and share a random fact about Catalonia, and the UI shows "La IA s'està despertant. Un moment, si us plau." until the greeting comes back; only then is the chat enabled. After that the message is never shown again; a slow reply later in the session just shows "Pensant…". To avoid cold starts, set the endpoint's minimum active workers to 1 in RunPod; that worker is billed while idle.
- Because the request stays open during a cold start, `/api/chat` sets `maxDuration` to 300 seconds. If your host caps function time below the cold start, the session start fails with an error and can be retried once the worker is up.

## The model host on Cloud Run

A second model host is being built on Google Cloud Run, to bring the cold start under a minute: a quantised copy of the model served by llama.cpp. The plan is in `docs/specs/model-host-cloud-run.md` and the reasons for the engine in `docs/adr/0001-quantised-llama-cpp-on-cloud-run.md`. RunPod serves the app until the new host has been compared with it. Everything the host is built and deployed from is in `model/`.

`model/bootstrap.sh` creates the cloud resources, in the project and region named at its top:

- a Docker repository in Artifact Registry, `model-host`;
- a bucket, `<project>-model-weights`, private and in the same region;
- a service account for the service, `model-host`, which can read the API key and nothing else;
- a service account for the pipeline, `model-host-pipeline`, which can push images to the repository, deploy to Cloud Run as the service's account, write build logs, and read the bucket;
- a secret in Secret Manager, `model-host-api-key`, holding a key the script generates. The key is never shown. To read it, for the app's `MODEL_HOST_API_KEY`, run `gcloud secrets versions access latest --secret model-host-api-key`.

It then mirrors the weights into the bucket, so that no build depends on Hugging Face: the Q6_K quantisation of the model, 6.38 GB, from [`mradermacher/salamandra-7b-instruct-2606-GGUF`](https://huggingface.co/mradermacher/salamandra-7b-instruct-2606-GGUF) at a pinned revision. The file is downloaded to a temporary directory, its SHA-256 is checked against the value in the script, and it is uploaded only if they match.

```bash
model/bootstrap.sh
```

It needs `gcloud`, signed in as someone who can create these resources, plus `curl` and `openssl`. It can be run again: whatever already exists is left alone, including the key and the weights file. The repository, the bucket and the secret are billed for what they store, which is a few cents a day.

The weights image holds the weights file and nothing else, and the service image will copy the file from it. It is built by hand with the command the script prints when it finishes, once, and again only when the weights change:

```bash
gcloud builds submit --no-source \
  --project <project> --region europe-west4 \
  --config model/cloudbuild-weights.yaml \
  --service-account projects/<project>/serviceAccounts/model-host-pipeline@<project>.iam.gserviceaccount.com
```

Its tag names the quantisation and the revision it holds, as in `weights:Q6_K-8bcd7d8d8545749ef73b3046f7cb5cd64d8c70c1`. To change the weights, change the file, revision and checksum at the top of `model/bootstrap.sh` and the same file and revision in `model/cloudbuild-weights.yaml`, then run both again. The service image names them too: the weights image's tag in `model/cloudbuild.yaml` and the file in `model/Dockerfile`.

### The service image

`model/Dockerfile` puts the weights beside llama.cpp's server. It starts from the official `server-cuda` image, pinned by digest, and copies the weights from the weights image into a layer of their own, ahead of the server's flags, so that changing a flag does not move 6.4 GB. The flags are the image's `CMD`:

- four replies at once, with 8,192 tokens of context each;
- the chat template embedded in the weights file, since no other is given;
- top-k and min-p switched off, so that sampling is governed by the temperature and top-p the app sends;
- the model served under the name the app asks for by default, `BSC-LT/salamandra-7b-instruct-2606`.

The server checks an API key on every request except its health route. It reads the key from `LLAMA_API_KEY`, which Cloud Run sets from Secret Manager, so the key is in no image and no script.

`model/cloudbuild.yaml` builds the image in Cloud Build and pushes it as `service:<tag>`. From the repository root:

```bash
gcloud builds submit model --config model/cloudbuild.yaml \
  --project <project> --region europe-west4 \
  --service-account projects/<project>/serviceAccounts/model-host-pipeline@<project>.iam.gserviceaccount.com \
  --gcs-source-staging-dir gs://<project>-model-weights/source \
  --substitutions _TAG=$(git rev-parse --short HEAD)
```

### Deploying by hand

`model/deploy.sh` holds every setting of the Cloud Run service and takes the image to deploy:

```bash
model/deploy.sh europe-west4-docker.pkg.dev/<project>/model-host/service:<tag>
```

The service is `model-host` in `europe-west4`: one NVIDIA L4, 4 CPUs and 16 GiB of memory, billed while an instance is up. It scales between zero and one instance, so it costs nothing when idle and never more than one GPU, and it takes four requests at once. A startup probe on the server's `/health` keeps requests from an instance until the weights are loaded. Cloud Run lets anyone reach the service; the API key is the gate. **A deploy starts a GPU instance**, which Cloud Run shuts down again after it has been idle for a while.

To point the app at it, set `MODEL_HOST_URL` to the service's URL followed by `/v1`, and `MODEL_HOST_API_KEY` to the key.

`model/time-reply.mjs` sends the model host one message and prints, as one line of JSON, how long the first word of the reply took, which is the cold start when no instance was running:

```bash
MODEL_HOST_API_KEY=$(gcloud secrets versions access latest --secret model-host-api-key) \
  node model/time-reply.mjs https://<service URL>
```

## Hearing a reply

Tap a reply and a speaker button appears under it. Tapping that plays the reply as speech; tapping the reply again, or pressing anywhere else, dismisses it. While the reply is being spoken the button becomes a mute button, which ends the sound, and a second mute button shows in the header.

A reply keeps speaking until it ends, it is muted, or another reply has loaded and takes over; tapping another reply doesn't stop it. A reply that was muted or has ended is spoken again from the audio already loaded, without a second request.

```
Browser ──POST /api/speak──▶ Next.js ──POST /v1/tts──▶ Matxa-TTS API
        ◀── audio/wav ──────         ◀── audio/wav ───
```

The speech comes from the [Matxa-TTS API](https://github.com/robritz/matxa-tts-api), a separate service that this app does not include. It is expected at `http://localhost:8000`. Once it is hosted, set `TTS_API_URL` to its base URL; nothing else needs to change, because the browser only ever calls `/api/speak`. That route is behind the secret phrase like the chat, and rejects text that is longer than the 2,000 characters the API accepts once normalized. The voice, format, steps and speaking rate are in `VOICE_SETTINGS` in `src/lib/tts.ts`.

When the page loads, the browser asks `GET /api/speak/health` whether replies can be spoken, and the server asks the TTS API's `/health` in turn. If the API reports an error, can't be reached, or takes more than five seconds to answer, the speaker buttons are hidden, in the conversation and among the saved exchanges, until the page is reloaded; replies can still be saved. The route is behind the secret phrase too, so a locked page asks once it has been unlocked.

The model behind the API, [Matxa-TTS v2](https://huggingface.co/BSC-LT/matxa-tts-v2-ca-multiaccent-graphemes), reads graphemes: only Catalan letters and a little punctuation, with numbers written out in words. The API rejects anything else, so `/api/speak` first normalizes the reply in `src/lib/speech-text.ts`: numbers and a few symbols (`%`, `€`, `$`, `&`, `+`, `=`) become Catalan words, Markdown, links and emoji are removed, and each line ends as a sentence. Numbers are always read in the masculine ("dos", not "dues"), and abbreviations and ordinals are not expanded.

## Saved exchanges

An exchange is a message together with the reply to it. Tapping a reply also shows a bookmark button beside the speaker button; tapping it saves the exchange, and tapping it again unsaves it. The greeting can't be saved, because the message it answers is never shown.

The **Desats** button in the header swaps the conversation for the list of saved exchanges, newest first. Each row shows a message, and opens to show the reply; one row is open at a time. **Torna al xat** returns to the conversation, which is left as it was. The list can be opened as soon as the chat is unlocked, so a saved translation can be read while the model is still waking.

Under the reply of an open row are a speaker button and a delete button. The delete button removes the saved exchange at once, with no confirmation; it is the same as unsaving it from the conversation. The speaker button speaks the reply as in the conversation, and is the one part of the list that needs the network: the speech is fetched from `/api/speak` each time, and no audio is stored.

There is one sound for the whole chat. A reply started in the list keeps speaking when its row is closed and when the user returns to the conversation, and a reply started in the conversation keeps speaking in the list; the mute button in the header stops it from either. A reply that is both in the conversation and saved is two sources of sound, and only the one that was tapped shows the mute button under it. The sound stops when the saved exchange it was started from leaves the list. **Nova conversa** stops a sound started in the conversation, and leaves one started in the list.

Saved exchanges are kept in the browser's `localStorage`, with no network call, so they outlive the conversation and the session. That also means:

- The list belongs to one browser on one device. Nothing is synced.
- Clearing the site's data removes it.
- iOS Safari may evict it after about a week without a visit, unless the app has been added to the home screen.

When storage doesn't behave, the list fails safely:

- If the browser refuses a save, because storage is full or blocked, "No s'ha pogut desar." is shown under the reply and the bookmark stays an outline. What was stored is left as it was.
- Stored data that can't be read, or that this version didn't write, is shown as an empty list. It is left alone until the next save, which replaces it.
- With the app open in two tabs, a change in one appears in the other. Every change starts from what is stored at that moment, so one tab never erases what the other has saved.

Two exchanges are the same when both the message and the reply read the same, which is how a reply is known to be saved after a reload. All reading and writing of the list is in `src/lib/saved-exchanges.ts`.

## Secret phrase

The chat is locked until the user types the secret phrase set in `CHAT_SECRET_PHRASE` (case and extra spaces are ignored). Until then, anything typed is checked as the phrase and never sent to the model, and the UI shows "Please enter the secret phrase to start chatting."

The check runs on the server. `POST /api/unlock` sets an httpOnly cookie holding a hash of the phrase, and the chat API route returns `401` without it, so the model can't be reached by calling the API directly. The cookie lasts a year. To change the phrase, change `CHAT_SECRET_PHRASE` and restart the server; existing cookies stop working when you do. If the variable is missing, the page fails to load with an error rather than leaving the chat open.

This is a light gate to keep casual visitors out, not real authentication. Anyone who knows the phrase gets in.

## Project layout

| Path                                | Purpose                                                         |
| ----------------------------------- | --------------------------------------------------------------- |
| `src/lib/chat.ts`                   | Validates the browser's messages, reduces them to plain text, and picks out translation requests |
| `src/lib/model-host.ts`             | System and translation prompts, sampling values, and the AI SDK model for the model host |
| `src/lib/unlock.ts`                 | Secret phrase check and unlock cookie                           |
| `src/lib/speech-text.ts`            | Normalizes a reply into text the TTS model can read             |
| `src/lib/tts.ts`                    | Voice settings, and the speech and health requests to the Matxa-TTS API |
| `src/lib/saved-exchanges.ts`        | Reads and writes the saved exchanges in the browser's `localStorage` |
| `src/lib/token-usage.ts`            | The token counts of the conversation, readable from any component with `useTokenUsage` |
| `docs/comparison/`                  | A fixed set of messages for comparing model hosts, RunPod's and Cloud Run's replies to them, and a script to replay them |
| `model/bootstrap.sh`                | Creates the cloud resources the Cloud Run model host is assembled from, and mirrors the weights into the project |
| `model/cloudbuild-weights.yaml`     | Builds the weights image from the mirrored file. Run by hand    |
| `model/Dockerfile`                  | The model host's service image: llama.cpp's server, the weights and the server's flags |
| `model/cloudbuild.yaml`             | Builds the service image and pushes it                          |
| `model/deploy.sh`                   | Deploys an image as the Cloud Run service, and holds its settings |
| `model/time-reply.mjs`              | Sends the model host one message and times the reply            |
| `src/app/api/unlock/route.ts`       | `POST /api/unlock`: checks the phrase and sets the cookie       |
| `src/app/api/chat/route.ts`         | `POST /api/chat`: validates messages and streams the reply      |
| `src/app/api/speak/route.ts`        | `POST /api/speak`: returns a reply as spoken audio              |
| `src/app/api/speak/health/route.ts` | `GET /api/speak/health`: reports whether replies can be spoken  |
| `src/app/chat.tsx`                  | Chat UI (client component)                                      |
| `src/app/reply.tsx`                 | Formats the text of a reply                                     |
| `src/app/saved-exchanges.tsx`       | The list of saved exchanges                                     |
| `src/app/listen-button.tsx`         | The button that speaks a reply, in the conversation and the list |
| `src/app/path-icon.tsx`             | An icon drawn from a single path                                |
| `src/app/layout.tsx`                | Root layout and mobile viewport settings                        |
| `src/app/robots.txt`                | Asks search engines not to crawl the site                       |

To change the model's behavior, edit `SYSTEM_PROMPT` in `src/lib/model-host.ts`; `TRANSLATION_PROMPT` in the same file is used for messages sent with translation on. To change the session-start message, edit `GREETING_PROMPT` in `src/app/chat.tsx`.

## Mobile

The input bar stays above the on-screen keyboard. Android Chrome does this through the viewport setting `interactive-widget=resizes-content` in `layout.tsx`. iOS Safari ignores that setting, so `chat.tsx` sizes the chat container to `window.visualViewport` instead.

## Scripts

```bash
npm run dev     # development server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # ESLint
npm test        # Vitest in watch mode; `npm test -- run` for a single run
```

## Tests

Tests use [Vitest](https://vitest.dev) and React Testing Library, and sit next to the code they cover as `*.test.ts(x)`. They never call the model host: `fetch`, the model, cookies and the environment variables are stubbed.
