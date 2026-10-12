// Sends the model host one message and times the reply, to measure a cold
// start: run it when the service has no instance.
//
//   MODEL_HOST_API_KEY=<key> node model/time-reply.mjs <service URL>
//
// It prints one line of JSON: the seconds until the first word of the reply
// and until its end, the token counts that close the stream, and the reply.

const [serviceUrl] = process.argv.slice(2);
const key = process.env.MODEL_HOST_API_KEY;
if (!serviceUrl || !key) {
  console.error(
    "Usage: MODEL_HOST_API_KEY=<key> node model/time-reply.mjs <service URL>",
  );
  process.exit(1);
}

const sentAt = performance.now();
const secondsSinceSent = () =>
  Number(((performance.now() - sentAt) / 1000).toFixed(1));

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
  },
);
if (!res.ok) {
  throw new Error(`The model host answered ${res.status}.`);
}

let reply = "";
let firstWordSeconds = null;
let usage = null;
let unread = "";
for await (const text of res.body.pipeThrough(new TextDecoderStream())) {
  unread += text;
  const lines = unread.split("\n");
  unread = lines.pop();
  for (const line of lines) {
    if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
    const chunk = JSON.parse(line.slice("data: ".length));
    const words = chunk.choices?.[0]?.delta?.content;
    if (words) {
      firstWordSeconds ??= secondsSinceSent();
      reply += words;
    }
    usage = chunk.usage ?? usage;
  }
}

console.log(
  JSON.stringify({
    event: "reply_timed",
    firstWordSeconds,
    totalSeconds: secondsSinceSent(),
    inputTokens: usage?.prompt_tokens ?? null,
    outputTokens: usage?.completion_tokens ?? null,
    reply,
  }),
);
