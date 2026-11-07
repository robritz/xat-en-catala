---
status: accepted
---

# Serve ALIA at Q8_0 on an RTX PRO 6000, and give it a cold-start target of its own

ALIA is added as a second model beside Salamandra, on a model host of its own. It is a 40B model, and at any quantisation above Q3 it does not fit the L4's 24 GB once its context is counted, so it runs on Cloud Run's other GPU, the RTX PRO 6000 with 96 GB, which also needs 20 CPUs and 80 GiB. Having paid for that GPU, we serve BSC's own Q8_0 conversion, 43 GB and effectively lossless, rather than spend fidelity to save memory we have. The cost is the cold start: ADR 0001 chose Salamandra's weights to start within 60 seconds, and ALIA loads almost seven times the bytes. ALIA is held to a target of its own, set from a measured cold start, not to 60 seconds.

## Considered Options

- **Q3_K_M or smaller on the L4.** Cheapest per second and the same GPU as Salamandra, but a 20 GB file leaves little room for context on 24 GB, and a 40B model cut to three bits gives up much of what it is chosen for.
- **mradermacher's Q6_K (33 GB) or Q4_K_M (24.6 GB) on the RTX PRO 6000.** Fewer bytes and a faster start, from a third-party conversion as Salamandra's is. Kept as the fallback if Q8_0's cold start is too long.
- **Hold ALIA to 60 seconds.** It would force the smallest file that passes, deciding the fidelity by the start time rather than the other way round.

## Consequences

- If ALIA's measured cold start is far over the target set for it, roughly three minutes, the weights are revisited (Q6_K first) before the target is raised again.
- The chat route's time limit and each host's request timeout follow the slower model's cold start. Salamandra's limit rises with ALIA's even though Salamandra does not need it.
- Builds of ALIA's weights and service images need a larger disk and a longer timeout than Cloud Build's defaults.
- An idle RTX PRO 6000 instance, kept warm by Cloud Run after the last request, costs several times what an idle L4 does.
