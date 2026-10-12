---
status: accepted
---

# Serve a quantised model with llama.cpp on Cloud Run, not full weights with vLLM

The model was served at full precision by vLLM on RunPod, where a cold start took three to four minutes. For the Cloud Run model host we serve the Q6_K quantisation with llama.cpp's server instead, because the cold start is dominated by the engine's own startup and by the bytes it loads: llama.cpp starts in seconds, and 6.4 GB of weights is under half of the 15 GB vLLM reads. We accept slightly lower fidelity and much lower throughput under load, since the chat serves a handful of learners at a time and vLLM's batching would buy nothing.

## Considered Options

- **vLLM with full-precision weights.** Identical replies to RunPod, but its startup alone adds a minute or more, which rules out the 60-second target.
- **Ollama.** Runs the same engine behind a daemon and its own model store, which costs start time and hides the server's flags.
- **Q4_K_M or Q8_0.** Q4_K_M is Google's default advice and the smallest, but the model already struggles to tell a translation from a question, so fidelity was not spent to save a second or two. Q8_0 is effectively lossless but 2 GB more to load.

## Consequences

- The weights come from a third-party conversion, `mradermacher/salamandra-7b-instruct-2606-GGUF`, because BSC publishes no GGUF of this release. They are pinned by revision and checksum and mirrored into our own bucket.
- Replies are not identical to RunPod's. RunPod is retired only after a fixed set of messages has been compared by reading.
- If the chat ever serves many learners at once, this decision should be revisited before the instance limit is raised.
