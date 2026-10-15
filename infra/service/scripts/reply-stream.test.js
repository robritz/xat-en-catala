// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { streamReply } from "./reply-stream.js";

// A response whose body arrives in the pieces given, as a server's would.
function streamed(...pieces) {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const piece of pieces) controller.enqueue(encoder.encode(piece));
        controller.close();
      },
    }),
  );
}

const event = (chunk) => `data: ${JSON.stringify(chunk)}\n\n`;

async function collect(replies) {
  const pieces = [];
  for await (const piece of replies) pieces.push(piece);
  return pieces;
}

afterEach(() => vi.unstubAllGlobals());

describe("streamReply", () => {
  it("yields the words and then the token counts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        streamed(
          event({ choices: [{ delta: { content: "Hola" } }] }),
          event({ choices: [{ delta: { content: "!" } }] }),
          event({ choices: [], usage: { prompt_tokens: 5, completion_tokens: 2 } }),
          "data: [DONE]\n\n",
        ),
      ),
    );

    expect(await collect(streamReply("https://host", "key"))).toEqual([
      { words: "Hola" },
      { words: "!" },
      { usage: { prompt_tokens: 5, completion_tokens: 2 } },
    ]);
  });

  it("joins an event split across two reads", async () => {
    const whole = event({ choices: [{ delta: { content: "Bon dia" } }] });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => streamed(whole.slice(0, 20), whole.slice(20))),
    );

    expect(await collect(streamReply("https://host", "key"))).toEqual([
      { words: "Bon dia" },
    ]);
  });

  it("posts to the chat completions route with the key, whatever the URL ends with", async () => {
    const fetch = vi.fn(async () => streamed("data: [DONE]\n\n"));
    vi.stubGlobal("fetch", fetch);

    await collect(streamReply("https://host/", "secret"));

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://host/v1/chat/completions");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer secret");
    expect(JSON.parse(init.body)).toMatchObject({ stream: true, temperature: 1, top_p: 1 });
  });

  it("names the status when the host refuses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));

    await expect(collect(streamReply("https://host", "wrong"))).rejects.toThrow(
      "The model host answered 401.",
    );
  });
});
