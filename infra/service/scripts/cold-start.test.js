// @vitest-environment node
import { describe, expect, it } from "vitest";
import { timeFirstWord } from "./cold-start.js";

// A clock that moves on by the seconds given each time it is read.
function clock(...readings) {
  const times = [...readings];
  return () => times.shift() * 1000;
}

async function* replying(...pieces) {
  yield* pieces;
}

describe("timeFirstWord", () => {
  it("measures the seconds until the first words arrive", async () => {
    const result = await timeFirstWord({
      replies: replying({ words: "Hola" }, { words: "!" }),
      signal: new AbortController().signal,
      targetSeconds: 60,
      now: clock(0, 10.94),
    });

    expect(result).toEqual({ seconds: 10.9, failure: null });
  });

  it("stops reading the reply once the first words arrive", async () => {
    let readOn = false;
    async function* replies() {
      yield { words: "Hola" };
      readOn = true;
      yield { words: "!" };
    }

    await timeFirstWord({
      replies: replies(),
      signal: new AbortController().signal,
      targetSeconds: 60,
      now: clock(0, 1),
    });

    expect(readOn).toBe(false);
  });

  it("fails a reply that has no words", async () => {
    const result = await timeFirstWord({
      replies: replying({ usage: { prompt_tokens: 5, completion_tokens: 0 } }),
      signal: new AbortController().signal,
      targetSeconds: 60,
      now: clock(0),
    });

    expect(result).toEqual({ seconds: null, failure: "The reply had no words." });
  });

  it("fails with the target when the signal ran out first", async () => {
    const controller = new AbortController();
    async function* replies() {
      controller.abort();
      throw new DOMException("aborted", "TimeoutError");
    }

    const result = await timeFirstWord({
      replies: replies(),
      signal: controller.signal,
      targetSeconds: 60,
      now: clock(0),
    });

    expect(result).toEqual({ seconds: null, failure: "No reply within 60 seconds." });
  });

  it("fails with the error when the host refused", async () => {
    async function* replies() {
      throw new Error("The model host answered 503.");
    }

    const result = await timeFirstWord({
      replies: replies(),
      signal: new AbortController().signal,
      targetSeconds: 60,
      now: clock(0),
    });

    expect(result).toEqual({ seconds: null, failure: "The model host answered 503." });
  });
});
