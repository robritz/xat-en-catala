// Names the revision that takes all of a Cloud Run service's traffic, from
// what `gcloud run services list --format json` prints for that one service:
// a list holding it, or an empty list before its first deploy, when the name
// is empty.
//
// A revision can be reached twice, by name and as the latest, so its shares
// are added up.

export function servingRevision(services) {
  const [service] = services;
  if (!service) return "";

  const shares = new Map();
  for (const { revisionName, percent = 0 } of service.status?.traffic ?? []) {
    shares.set(revisionName, (shares.get(revisionName) ?? 0) + percent);
  }
  for (const [revision, percent] of shares) {
    if (percent === 100) return revision;
  }
  throw new Error(`No revision of ${service.metadata.name} takes all its traffic.`);
}
