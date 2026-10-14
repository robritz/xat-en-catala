// Sends the model host one message and yields the reply as it streams: each
// piece of text as it arrives, as { words }, and the token counts that close
// the stream, as { usage }. Stopping early, or aborting the signal, closes the
// request.

export async function* streamReply(serviceUrl, key, signal) {
  const res = await fetch(
    `${serviceUrl.replace(/\/$/, "")}/v1/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "BSC-LT/salamandra-7b-instruct-2606",
        messages: [{ role: "user", content: "Hola! Com estàs?" }],
        temperature: 1,
        top_p: 1,
        stream: true,
        stream_options: { include_usage: true },
      }),
      signal,
    },
  );
  if (!res.ok) {
    throw new Error(`The model host answered ${res.status}.`);
  }

  let unread = "";
  for await (const text of res.body.pipeThrough(new TextDecoderStream())) {
    unread += text;
    const lines = unread.split("\n");
    unread = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      const chunk = JSON.parse(line.slice("data: ".length));
      const words = chunk.choices?.[0]?.delta?.content;
      if (words) yield { words };
      if (chunk.usage) yield { usage: chunk.usage };
    }
  }
}
