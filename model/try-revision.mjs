// Sends a revision that takes no traffic one message, through its tag's URL,
// and waits for the first word of the reply. model/cloudbuild.yaml runs it
// before it sends traffic to the revision.
//
//   MODEL_HOST_API_KEY=<key> node model/try-revision.mjs <tag URL> <revision>
//
// The revision has never run, so the wait is its cold start. It prints that as
// one line of JSON, e.g.
//
//   {"event":"cold_start","revision":"model-host-00002-abc","seconds":10.9,"passed":true}
//
// and exits with 1, naming what went wrong, if no word came within the target.

import { streamReply } from "./reply-stream.mjs";

const TARGET_SECONDS = 60;

const [tagUrl, revision] = process.argv.slice(2);
const key = process.env.MODEL_HOST_API_KEY;
if (!tagUrl || !revision || !key) {
  console.error(
    "Usage: MODEL_HOST_API_KEY=<key> node model/try-revision.mjs <tag URL> <revision>",
  );
  process.exit(1);
}

const sentAt = performance.now();
const signal = AbortSignal.timeout(TARGET_SECONDS * 1000);

let seconds = null;
let failure = null;
try {
  for await (const piece of streamReply(tagUrl, key, signal)) {
    if (piece.words) {
      seconds = Number(((performance.now() - sentAt) / 1000).toFixed(1));
      break;
    }
  }
  if (seconds === null) failure = "The reply had no words.";
} catch (error) {
  failure = signal.aborted
    ? `No reply within ${TARGET_SECONDS} seconds.`
    : error.message;
}

console.log(
  JSON.stringify({
    event: "cold_start",
    revision,
    seconds,
    passed: failure === null,
    ...(failure && { failure }),
  }),
);
process.exit(failure ? 1 : 0);
