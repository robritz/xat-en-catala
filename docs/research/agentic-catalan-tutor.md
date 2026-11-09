# Turning the ALIA chat into an agentic Catalan tutor

Terms in **bold** on first use are defined in `CONTEXT.md` at the repository root. Use them as defined there.

Researched on 2026-11-09 against the repository at `586adb9` and the primary sources linked inline. Nothing in the app was changed.

## The question

"What approach should I take to turn the ALIA model integration into a more agentic structure focused on teaching people Catalan?"

## Recommendation

Orchestrate in code, around ALIA, and do not ask ALIA to drive a tool loop. ALIA's own card says it cannot call functions, and the chat template in the weights file the host serves has no place for tools and rejects any message that is not from the user or the assistant. What llama.cpp does reliably for a model like this is constrain its output to a JSON schema. So the app's route decides each step, ALIA does the narrow jobs it is good at (writing Catalan, judging a sentence, filling a small schema), and deterministic code does the rest: grammar checking, scheduling reviews, tracking the learner.

In phases:

0. **Make single replies trustworthy first.** Tickets 07 to 10 (runaway replies, wrong language, uncut sign-offs, Markdown) get worse, not better, when one turn becomes several calls. A cap on reply length (`maxOutputTokens`) is the minimum before anything else.
1. **A tutor turn in code.** One module that runs a short, fixed workflow per **message**: work out what kind of message it is, correct the learner's Catalan if they wrote some, then write the **reply**. The correction is shown under the reply as a separate part of the stream. This is the first slice below.
2. **Review without the model.** Spaced repetition over **saved exchanges**, scheduled by FSRS in the browser. No GPU, no **cold start**.
3. **Generated practice.** Exercises and an end-of-session summary, each one ALIA call constrained to a schema, checked by code before the learner sees it.
4. **Only then, if needed, a router.** A small hosted model that can call tools, planning the session and calling ALIA as one of its tools for Catalan text. Nothing in phases 1 to 3 needs it, and it adds a second provider, a second bill and learner text leaving the BSC models.

## Where the app is today

- **One route, one call.** `src/app/api/chat/route.ts` validates the **conversation**, picks the teacher prompt or the translation prompt, and makes a single `streamText` call with stop sequences, then streams it to the browser with token counts as metadata. There is no tool, no second step and no structured output. `maxDuration` is 180 seconds for both models.
- **Prompts and model choice.** `src/lib/model-host.ts` holds `TEACHER`, the **tier** rules, `TRANSLATION_PROMPT`, `SIGN_OFFS` and the two models. Each model is an `@ai-sdk/openai-compatible` chat model wrapped with its sampling (ALIA: temperature 0.1, top-p 1). No `maxOutputTokens` is set, and the provider is created without `supportsStructuredOutputs`.
- **The learner.** `src/lib/learner-profile.ts` keeps a **native language** and a self-assessed **level**, A1 to C2, in `localStorage`. The server rebuilds the instructions from it on every request. Nothing records what the learner gets right or wrong.
- **Saved exchanges.** `src/lib/saved-exchanges.ts` keeps `{ message, reply }` pairs in `localStorage`, version 1, with no review data.
- **The host.** `model/alia/Dockerfile` runs llama.cpp's `server-cuda` image, build b11561, pinned by digest, serving `ALIA-40b-instruct-2601-Q8_0.gguf` with `--parallel 4`, `--ctx-size 32768` (8,192 tokens per slot), `--top-k 0`, `--min-p 0`, and the chat template embedded in the weights. `infra/service/main.tf` runs it on one RTX PRO 6000, zero to one instance, four requests at once, 180-second timeout. Why Q8_0 on that GPU is in `docs/adr/0003-alia-q8-on-rtx-pro-6000.md`.
- **What ALIA gets wrong.** `.scratch/alia-model/issues/06-the-chat-on-alia-end-to-end.md` found, from nine requests: 3 runaway replies cut at 180 seconds and about 5,700 tokens; English questions answered in English; beginners' explanations in Catalan instead of the native language; sign-offs the stop list misses; Markdown and a "¿". Tickets 07 to 10 track them. Ticket 11 records that anyone can wake the host, at about $3.19 an hour while ALIA's instance is up and $1.05 for Salamandra's.
- **Cold start.** ALIA woke in 16.6 seconds in ticket 06; the route's comment gives 18 to 31 seconds on Cloud Run.
- **Ideas already written down.** `.scratch/future-ideas/issues/01-features-that-help-a-learner-learn.md` lists ten features. Several are steps an agent would take: spaced repetition (1), correcting the learner's Catalan as a narrow, separate request (2), tap-a-word lookup (5), role-play with a goal (6), an end-of-session summary (9), and exercises graded by the app rather than the model (10).

## Findings

### ALIA cannot be the agent

- **No function calling, by its makers' account.** The model card says: "No Function Calling: The model cannot natively execute or call external functions/APIs", and that it has no "agentive or autonomous action capabilities" ([BSC-LT/ALIA-40b-instruct-2601](https://huggingface.co/BSC-LT/ALIA-40b-instruct-2601)). Its instruction-tuning data as listed on the card has no function-calling, tool-use or JSON datasets. Salamandra's card says the same of Salamandra ([BSC-LT/salamandra-7b-instruct-2606](https://huggingface.co/BSC-LT/salamandra-7b-instruct-2606)).
- **The served template has no tools in it.** The GGUF repository's metadata at the pinned revision `257ea58…` (the same revision `docs/specs/alia-model.md` pins) carries a ChatML template that renders an optional system message, then strictly alternating user and assistant turns, and calls `raise_exception('Only user and assistant roles are suported after the initial optional system message.')` for anything else ([Hugging Face API, `expand[]=gguf`](https://huggingface.co/api/models/BSC-LT/ALIA-40b-instruct-2601-GGUF?expand[]=gguf)). It never refers to `tools`, so a tool's description cannot reach the model through it, and a `tool` message, which every tool loop sends back after a call, is an error.
- **Sampling.** The card recommends "temperatures close to zero (0 - 0.2)" and advises "against using any type of repetition penalty". It also lists a context length of 163,840 tokens; this host gives each slot 8,192.
- **Serving.** The card says llama.cpp suits the GGUF files and "strongly discourage[s] using ollama".

### What llama.cpp's server gives an orchestrator

- **`--jinja` is on by default in the pinned build.** At tag `b11561`, `common/common.h` sets `use_jinja = true` and `common/arg.cpp` offers `--no-jinja` to turn it off ([common.h](https://github.com/ggml-org/llama.cpp/blob/b11561/common/common.h), [arg.cpp](https://github.com/ggml-org/llama.cpp/blob/b11561/common/arg.cpp)). The server README agrees: "default: enabled" ([tools/server/README.md](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md)).
- **Tool calling depends on the template.** The function-calling doc ties OpenAI-style tools to `--jinja` and to templates it recognises, lists the natively supported families (Llama 3.x, Hermes, Qwen 2.5, Mistral Nemo, Functionary, Command R7B, GPT-OSS and others), and suggests overriding the template where none fits ([docs/function-calling.md](https://github.com/ggml-org/llama.cpp/blob/master/docs/function-calling.md)). At `b11561`, `common/chat.cpp` picks a specialised handler or else derives a parser from the template itself, and throws "Unable to generate parser for this template" when it cannot ([chat.cpp](https://github.com/ggml-org/llama.cpp/blob/b11561/common/chat.cpp)). Forcing a tool-calling template onto ALIA would ask it for a format it was not trained on.
- **Constrained JSON works with any template.** The chat endpoint maps `response_format` of type `json_schema` (or `json_object` with a `schema`) to grammar-based sampling; a `json_object` with no schema becomes "any object" ([tools/server/server-common.cpp at b11561](https://github.com/ggml-org/llama.cpp/blob/b11561/tools/server/server-common.cpp), lines 1304–1323). The grammar README warns that only a subset of JSON Schema is supported, that "unsupported features are skipped silently", that `minimum`/`maximum` apply only to integers, and that the schema "is not injected into the prompt", so the prompt must describe the shape too ([grammars/README.md](https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md)). The constraint guarantees the shape, not that the content is right.
- **No length limit unless asked.** `n_predict` defaults to `-1`, "no limit" ([common.h at b11561](https://github.com/ggml-org/llama.cpp/blob/b11561/common/common.h)). That is why ticket 06's runaway replies ran until the route let go. Repetition, frequency, presence and DRY penalties all default to off in the same file.

### What the AI SDK gives an orchestrator

The app uses `ai` 7.0.133 and `@ai-sdk/openai-compatible` 3.0.66. The docs below are the ones shipped in `node_modules`.

- **Two styles, and which to start with.** `ToolLoopAgent` runs a model with tools in a loop and stops after 20 steps by default (`node_modules/ai/docs/03-agents/01-overview.mdx`, `04-loop-control.mdx`). The same docs say agents are "non-deterministic" and that "when you need reliable, repeatable outcomes with explicit control flow, use core functions with structured workflow patterns", and advise to "start with the simplest approach that meets your needs" (`03-agents/03-workflows.mdx`). The workflow patterns given are chains, routing, parallel steps, orchestrator–worker and evaluator–optimiser, all written as plain `generateText` calls with `if` statements between them.
- **Structured output.** `generateText` with `Output.object({ schema })`, `Output.array(...)` or `Output.choice({ options })` validates the result and throws if it does not match (`03-ai-sdk-core/10-generating-structured-data.mdx`). With `Output.choice`, a classification step is one call that returns one of a fixed set of strings.
- **How that reaches llama.cpp.** The OpenAI-compatible provider sends `response_format: { type: 'json_schema', json_schema: { schema, strict } }` only when the provider is created with `supportsStructuredOutputs: true`; otherwise it sends `{ type: 'json_object' }` (`node_modules/@ai-sdk/openai-compatible/src/chat/openai-compatible-chat-language-model.ts`, lines 292–306). Without the flag, llama.cpp would constrain ALIA to "any object" and only the SDK's validation would catch a wrong shape. `maxOutputTokens` is sent as `max_tokens` from the same file.
- **Extra parts in the stream.** A route can write its own typed parts (`data-…`) into the UI message stream beside the model's text (`04-ai-sdk-ui/20-streaming-data.mdx`). A correction note can travel this way without being mixed into the reply's text, so it is neither spoken nor saved by mistake.
- **Not needed.** `experimental_decide` (`03-ai-sdk-core/32-decisions.mdx`) is experimental and resolves string model ids through Vercel's AI Gateway by default; `Output.choice` covers the same need here.

### Next.js

- `after()` from `next/server` runs a callback after a route's response is finished (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/after.md`, Next 16.3.8). It suits work the learner need not wait for, such as logging what a turn found. It does not help with anything the learner must see.
- `maxDuration` is per route segment (`…/02-route-segment-config/maxDuration.md`). Each extra model call in a turn spends from the same 180 seconds.

### Teaching: what the agent needs to know and do

- **Levels.** The CEFR's six levels, A1 to C2, described by "can do" descriptors, with the 2020 Companion Volume as the current full set ([Council of Europe, CEFR Companion Volume](https://rm.coe.int/common-european-framework-of-reference-for-languages-learning-teaching/16809ea0d4)). The app already uses the levels for a self-assessment; a tutor could keep the self-assessment and add evidence (corrections per message, review results) beside it, without changing the level by itself. *Not opened in this session; see "Could not verify".*
- **Correction.** LanguageTool supports Catalan in three variants, `ca-ES`, `ca-ES-valencia` and `ca-ES-balear` ([api.languagetool.org/v2/languages](https://api.languagetool.org/v2/languages)). Its free public API allows 20 requests and 75 KB per minute per IP, 20 KB per request, gives no guarantees, says "Do not send automated requests. For that, set up your own instance of LanguageTool", and requires a visible link to languagetool.org ([public HTTP API](https://dev.languagetool.org/public-http-api)). A server route calling it for every learner is automated use, so in production this means a self-hosted instance. A rule-based checker returns the error's offset, rule and suggestions deterministically, which is what a learner's correction needs to be trusted; ALIA then turns that into a short explanation at the learner's tier.
- **Spaced repetition.** SM-2, as first described, keeps an E-Factor starting at 2.5, intervals of 1 day, 6 days, then the previous interval times the E-Factor, and a 0–5 grade; a grade below 3 restarts the item ([SuperMemo, Algorithm SM-2](https://super-memory.com/english/ol/sm2.htm)). FSRS models difficulty (1–10), stability (the interval at which recall probability is 90%) and retrievability, with four grades, Again, Hard, Good and Easy; the next interval comes from the desired retention ([FSRS: The Algorithm](https://github.com/open-spaced-repetition/awesome-fsrs/wiki/The-Algorithm)). `ts-fsrs` is its MIT-licensed TypeScript implementation ([repo](https://github.com/open-spaced-repetition/ts-fsrs)). Its current major, 6.0.0, requires Node 24 or later; 5.4.2 requires Node 20 or later ([npm registry](https://registry.npmjs.org/ts-fsrs)). This repository asks for Node 22 (`package.json`), so 5.x fits today. Scheduling needs no model at all.

## Options compared

| | A. Tool loop on ALIA | B. Code-driven workflow around ALIA | C. Router: tool-calling model plans, ALIA writes |
| --- | --- | --- | --- |
| How a turn runs | `ToolLoopAgent` with ALIA as the model; ALIA chooses tools | The route runs fixed steps; ALIA is called for classification (schema-constrained) and for the reply | A hosted model with tool support runs the loop; "write Catalan" is one of its tools, backed by ALIA |
| Does it work with ALIA? | No. The card rules out function calling, and the served template cannot carry tools or tool messages | Yes. Plain chat calls plus `json_schema` grammar, both supported by the pinned build | Yes, ALIA only ever gets plain chat calls |
| Reliability | Lowest: ALIA already misses the language and length rules in a single call | Each step is small and testable; code decides what happens next | Planning is as good as the hosted model; Catalan as good as ALIA |
| Effect of tickets 07–10 | Multiplied by every step | Multiplied by every ALIA step, but each step has a short schema and can carry `max_tokens` | Same for the ALIA tool call; planning is unaffected |
| Latency per turn | Several ALIA calls | One to three ALIA calls on the same warm instance; the four slots let a correction and a reply run side by side | A hosted call or more, then ALIA |
| Cold start | ALIA's, 17–31 s | ALIA's, 17–31 s, once per session | The planner has none; ALIA's still applies the first time it is called |
| Cost | ALIA's GPU time, more of it | ALIA's GPU time, a little more per turn (about $3.19 an hour while up) | ALIA's GPU time plus per-token charges for the planner, and a second key to manage |
| Fit with the repo | Contradicts what BSC says the model can do | Fits the current route and its tests; the spec's "one model serves every learner" still holds | A new provider, a new secret, and the learner's text leaving BSC's models, which the project may care about (see open questions) |
| Testability | Hard: behaviour depends on the model's choices | Each step is tested at the model-host seam, as `src/lib/model-host.test.ts` already does | Two seams to fake |

B is the recommendation. C becomes worth it only if the owner wants open-ended planning, such as an agent that decides on its own to switch to a role-play or to drill a weakness across sessions. Even then, the steps in B are what C's tools would wrap, so B's work is not lost.

## Where a model earns its place

This section is judgement, not a cited finding. It sets which steps below go to a model and which do not.

A model is hard to replace for:

- **Conversation practice.** A partner that answers anything the learner writes, at their tier, at any hour. Nothing deterministic does this, and it is what human tutors are paid for.
- **Explanations fitted to the learner.** Why *vaig anar* and not *anava*, in the native language, at the learner's tier, with follow-up questions.
- **Varied material.** Fresh exercises, role-play scenarios and example sentences built around the learner's own mistakes, rather than a fixed bank that runs out.
- **Making sense of messy input.** Half-Catalan, half-English messages, typos, and "how do I say…" questions.

A model adds little, or does harm, for:

- **Scheduling, grading and tracking progress.** Code is exact, free and instant.
- **Deciding what is correct.** A rule-based checker is consistent and names the rule. A model can invent a mistake or pass a wrong sentence, and a learner cannot tell which. In a teaching app this is the largest risk: a wrong correction teaches the error.
- **Vocabulary and conjugation.** A dictionary or conjugation table is reliable; a model can produce a confident wrong form.
- **Curriculum and sequencing.** Better designed by people from CEFR-based syllabuses than planned by a model across sessions.

The repository's own evidence points the same way. Ticket 06 found English questions answered in English, beginners' explanations in Catalan, runaway replies and Markdown. For a teaching app those are failures of reliability, not of style, and each needs a guard in code. Every model step also wakes a GPU host and pays $1 to $3 an hour while it is up; code steps cost almost nothing.

So the model is the conversation partner and the explainer, and is kept away from deciding what is correct. Correctness comes from LanguageTool, stored answers and dictionaries, and the model puts their results into words. Much of the teaching value comes from the structure around the conversation (spaced review of saved exchanges, practice aimed at the learner's own mistakes, visible progress), which needs little or no model.

**How to check this before building more.** Take 30 to 50 real learner sentences, some with known mistakes and some correct, and run them through ALIA, Salamandra and LanguageTool. Count false corrections and missed mistakes. If the models' false-correction rate is high, the question is settled: they write replies and explanations, and the checker decides what is right.

## The tutor's steps

None of these is a tool the model calls. Each is a step the route (`src/app/api/chat/route.ts`) or the browser runs. "Schema call" means a model call constrained by `response_format: json_schema`.

**Phases 1 and 2**

| Step | What it does | Runs on |
| --- | --- | --- |
| `classifyMessage` | Catalan attempt, question in the native language, translation request, or off-topic | Schema call with `Output.choice` |
| `checkCatalan` | Finds mistakes, with offset, rule and suggestions | Self-hosted LanguageTool (`ca-ES`, `ca-ES-valencia`, `ca-ES-balear`), or a schema call as a fallback |
| `explainCorrection` | Turns each finding into a short explanation in the native language, at the learner's tier | Model, plain text, small `maxOutputTokens` |
| `reply` | The tutor's Catalan reply, as today | Model, streamed |
| `scheduleReview` | Which saved exchanges are due for review, and when next | `ts-fsrs` 5.x in the browser, no model |
| `gradeReview` | Records Again, Hard, Good or Easy | Code |

**Phase 3**

| Step | What it does | Runs on |
| --- | --- | --- |
| `makeExercise` | Gap-fill, translation or reordering, drawn from the learner's mistakes and saved exchanges | Schema call |
| `gradeExercise` | Checks the answer against the stored solution; the model does not judge | Code, with `checkCatalan` for free text |
| `lookupWord` | Tap a word for its meaning, gender and conjugation | Schema call at first; a dictionary later |
| `summariseSession` | What was practised, mistakes that keep coming back, what to review | Schema call |
| `updateLearnerProfile` | Keeps a record of mistakes and weak points beside the self-assessed level | Code, on the device like the profile |

**Phase 4, only with a planner model (option C)**

| Step | What it does |
| --- | --- |
| `startRolePlay` | A scenario with a goal, such as ordering at the market |
| `planSession` | Decides what to drill next across sessions |

Before any of it: create the provider with `supportsStructuredOutputs: true` and set `maxOutputTokens` on every call. Without the flag the schema never reaches llama.cpp; without the cap each extra step can run away as replies do (ticket 07).

## Salamandra instead of ALIA

Nothing in option B depends on ALIA specifically, so the same steps can run on Salamandra.

What carries over:

- **Steps with no model** are unaffected.
- **Schema calls.** Salamandra's host runs the same pinned llama.cpp build, and `json_schema` grammar sampling works whatever the chat template (see "What llama.cpp's server gives an orchestrator").
- **Plain chat** (`reply`, `explainCorrection`) is what Salamandra already does.
- **No tool calling** either: its card says the same as ALIA's, and option B never asks for it.

What it gains:

- **Cost.** About $1.05 an hour while its instance is up, against about $3.19 for ALIA's (ticket 11).
- **Cold start.** Held to 60 seconds; ALIA loads almost seven times the bytes and has a target of its own (`docs/adr/0003-alia-q8-on-rtx-pro-6000.md`).

What it costs or risks:

- **Quality.** ALIA was added because, at 40B, it "may write better Catalan" (`docs/specs/alia-model.md`). A 7B model is likely weaker where judgement matters: spotting the learner's mistakes, explaining them, and writing good exercises. Replies and simple classification should be fine. Unmeasured.
- **Sampling.** The app sends Salamandra a temperature of 1; its card recommends 0 to 0.2. Classification and correction steps want a low temperature, so a per-step override is needed, and `docs/specs/alia-model.md` promises Salamandra's sampling stays unchanged.
- **Context** is the same: 8,192 tokens per slot on both hosts.
- **Not checked end to end.** Ticket 06 checked ALIA only, so whether Salamandra shares ALIA's runaway replies or wrong-language answers is unknown.

Suggested route: build the first slice with the model chosen per step, and run the comparison above through both. If Salamandra's corrections are good enough, use it throughout. If not, keep Salamandra for the cheap, frequent steps (classifying, replying) and use ALIA for corrections and exercises, or let LanguageTool decide correctness so neither model judges grammar. Using both models means two hosts to wake, and two cold starts.

## A first slice

**A learner's Catalan is corrected beside the reply.** (Idea 2 in `.scratch/future-ideas/issues/01-features-that-help-a-learner-learn.md`.)

**Blocked by:** 07 — ALIA's replies come to an end. Without a cap, a correction step can run away as replies do.

**What to build:** When the learner writes a message in Catalan and translation is off, the route first checks the sentence, then writes the reply as today. If the check finds something, the reply arrives with a short "Correcció" under it: the learner's sentence restated correctly and, at most, one line on what changed, in the native language at A1–A2 and in Catalan from B1. A message with no mistakes, or not in Catalan, gets no note.

Steps inside the route, in order:

1. **Is this Catalan?** One ALIA call with `Output.choice({ options: ["catalan", "other"] })`, temperature 0, a small `maxOutputTokens`. The provider is created with `supportsStructuredOutputs: true` so that llama.cpp constrains the answer.
2. **What is wrong with it?** Either LanguageTool (`language=ca-ES`; self-hosted for anything past a trial) or one ALIA call with `Output.object` for `{ corrected: string, change: string | null }`. Which one is the owner's choice; LanguageTool is deterministic and needs a service, ALIA needs nothing new and is less reliable.
3. **The reply.** The existing `streamText` call, unchanged, with `maxOutputTokens` set.
4. **The note.** Written to the stream as a `data-correction` part, shown under the reply, not spoken and not saved with the exchange.

Acceptance:

- [ ] A Catalan message with a known mistake (for example *"Ahir vaig anar a la mercat"*) shows a correction; a correct one shows none; an English one shows none.
- [ ] A translation request never runs the check.
- [ ] A failed or malformed check leaves the reply as it is today, with no note.
- [ ] The turn's steps live in one module with a small interface (message, profile in; stream out), tested at the model-host seam as the existing tests are, including the `response_format` each step sends.
- [ ] The time from message to first word of the reply, warm, is measured before and after, and recorded here.

## Open questions for the owner

1. **Tickets 07 to 10 first?** The recommendation assumes yes. Ticket 07's own choice (a cap, a penalty, or a temperature) also decides how every later step is configured.
2. **Separate prompts per model.** `docs/specs/alia-model.md` keeps prompts shared and puts ALIA's own prompts out of scope. A tutor workflow has several prompts per turn; do they stay shared with Salamandra, or does the workflow target ALIA only?
3. **Where may learner text go?** A self-hosted LanguageTool keeps it in your project; the public API or a hosted planner (option C) does not. Is that acceptable for a learning app that keeps everything else on the device?
4. **Where does learner state live?** Profile and saved exchanges are device-only today. Review schedules and a record of mistakes fit the same `localStorage` approach; an agent that remembers across devices needs accounts and a store, which the app does not have.
5. **Does the level stay self-assessed?** The tutor could suggest a level change from evidence, but CONTEXT.md defines the level as the learner's own judgement.
6. **Cost of more calls per turn.** Each extra ALIA call keeps the instance busy longer. With one instance and four slots, is a second call per message acceptable, or should the correction run only on request?
7. **Salamandra's sampling.** Its card recommends a temperature of 0 to 0.2, as ALIA's does; the app sends 1 (`src/lib/model-host.ts`). Matters if Salamandra runs any of the steps; see "Salamandra instead of ALIA".
8. **Run the correction comparison first?** The test in "Where a model earns its place" decides whether a model or LanguageTool judges correctness, which changes the first slice's step 2.

## Could not verify

- **The CEFR pages.** coe.int and rm.coe.int refused this session's requests (HTTP 403), so the statements on CEFR levels and "can do" descriptors are from the Companion Volume's known content, not from a page read here. Check the linked PDF before relying on the wording.
- **What llama.cpp does with tools and ALIA's template.** The conclusion that a tool loop on ALIA is not viable rests on the model card and on reading the template; no request with `tools` was sent to the host. Whether `b11561` errors, ignores the tools, or produces something parseable was not tested.
- **How well ALIA fills a schema.** The grammar guarantees valid JSON of the right shape; whether ALIA's classifications and corrections are right is unmeasured. The first slice measures it.
- **LanguageTool's quality for learners' Catalan,** and the resources a self-hosted instance needs. Softcatalà's grammar checker is said to be built on LanguageTool, but I did not open Softcatalà's documentation in this session, so who maintains the Catalan rules is unconfirmed.
- **`ts-fsrs` README details.** Its README says the v6 scheduler defaults to FSRS-7, while the FSRS wiki describes FSRS-6 as the latest. I did not reconcile the two; 5.x, which fits Node 22, was not read in detail.
- **Latency of an extra call on a warm ALIA instance.** No numbers exist in the repository for warm, short, constrained calls.
- **Salamandra's served chat template** was not read, and how well Salamandra fills a schema or judges a learner's sentence is unmeasured, as it is for ALIA.
