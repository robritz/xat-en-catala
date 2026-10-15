// Prints the revision taking all of the model host's traffic, or nothing
// before its first deploy. infra/service/cloudbuild.yaml runs it so that the
// revision keeps its traffic while a new one is tried.
//
//   gcloud run services list --filter metadata.name=model-host --format json |
//     node infra/service/scripts/serving-revision.js

import { text } from "node:stream/consumers";
import { servingRevision } from "./traffic.js";

console.log(servingRevision(JSON.parse(await text(process.stdin))));
