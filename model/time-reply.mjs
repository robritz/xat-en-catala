// Sends the model host one message and times the reply, to measure a cold
// start: run it when the service has no instance.
//
//   MODEL_HOST_API_KEY=<key> node model/time-reply.mjs <service URL>
//
// It prints one line of JSON: the seconds until the first word of the reply
// and until its end, the token counts that close the stream, and the reply.

import { streamReply } from "./reply-stream.mjs";

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

let reply = "";
let firstWordSeconds = null;
let usage = null;
for await (const piece of streamReply(serviceUrl, key)) {
  if (piece.words) {
    firstWordSeconds ??= secondsSinceSent();
    reply += piece.words;
  }
  usage = piece.usage ?? usage;
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
