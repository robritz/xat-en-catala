# Xat en català

A proof-of-concept chatbot for learning [Catalan](https://en.wikipedia.org/wiki/Catalan_language). Whatever language you write in, it replies in Catalan, as a teacher would answer a student, and explains a word or expression when that helps. A toggle translates what you type into Catalan instead of answering it. Replies can be played as speech and saved for later.

<img width="386" height="678" alt="image" src="https://github.com/user-attachments/assets/386b9a16-38ae-4f66-8f30-8f763b23c5d3" />

It's a Next.js app built on the [Vercel AI SDK](https://ai-sdk.dev). Setup, architecture and operations are in [docs/guide.md](docs/guide.md).

## Models

- **Chat:** [Salamandra 7B Instruct](https://huggingface.co/BSC-LT/salamandra-7b-instruct-2606) (`BSC-LT/salamandra-7b-instruct-2606`), an instruction-tuned model from the Barcelona Supercomputing Center (BSC) that supports Catalan, Spanish, Basque, Galician and English. Apache 2.0.
- **Speech:** [Matxa-TTS v2](https://huggingface.co/BSC-LT/matxa-tts-v2-ca-multiaccent-graphemes), a Catalan text-to-speech model from BSC, served by the separate [Matxa-TTS API](https://github.com/robritz/matxa-tts-api).

Both are part of BSC's [AINA Kit](https://langtech-bsc.gitbook.io/aina-kit), a collection of open models and datasets for building AI in Catalan.

## The service

The chat model runs on [Google Cloud Run](https://cloud.google.com/run): a Q6_K quantisation served by [llama.cpp](https://github.com/ggml-org/llama.cpp) behind an OpenAI-compatible API, on one NVIDIA L4 in `europe-west4`. It scales to zero when idle, so the first message of a session waits 10–20 seconds for a cold start. Terraform in `infra/` describes it, and a merge to `main` builds and deploys it, sending traffic to a new revision only after it replies within 60 seconds.

## Quick start

Requires Node.js 22+.

```bash
npm install
cp .env.example .env.local   # fill in the values; see docs/guide.md
npm run dev
```

## Demo

Since the models and text-to-speech are hosted on real cloud instances, they incur costs if left open. If you're interested in checking out the application in production please send a note via my contact details [here](https://robritz.com/contact/).
