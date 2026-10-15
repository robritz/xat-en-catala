// Sends a revision that takes no traffic one message, through its tag's URL,
// and waits for the first word of the reply. infra/service/cloudbuild.yaml
// runs it before it sends traffic to the revision.
//
//   MODEL_HOST_API_KEY=<key> node infra/service/scripts/try-revision.js <tag URL> <revision>
//
// The revision has never run, so the wait is its cold start. It prints that as
// one line of JSON, e.g.
//
//   {"event":"cold_start","revision":"model-host-00002-abc","seconds":10.9,"passed":true}
//
// and exits with 1, naming what went wrong, if no word came within the target.

import { timeFirstWord } from "./cold-start.js";
import { streamReply } from "./reply-stream.js";

const TARGET_SECONDS = 60;

const [tagUrl, revision] = process.argv.slice(2);
const key = process.env.MODEL_HOST_API_KEY;
if (!tagUrl || !revision || !key) {
  console.error(
    "Usage: MODEL_HOST_API_KEY=<key> node infra/service/scripts/try-revision.js <tag URL> <revision>",
  );
  process.exit(1);
}

const signal = AbortSignal.timeout(TARGET_SECONDS * 1000);
const { seconds, failure } = await timeFirstWord({
  replies: streamReply(tagUrl, key, signal),
  signal,
  targetSeconds: TARGET_SECONDS,
});

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
