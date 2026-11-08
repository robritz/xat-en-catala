// Reads, from a model's Dockerfile, the name its server serves the model
// under: the server's --alias. The app asks for the model by that name, so
// the deploy's message asks by it too, and a revision whose alias the app
// would not find fails before it takes traffic.

export function servedName(dockerfile) {
  const alias = dockerfile.match(/"--alias",\s*"([^"]+)"/);
  if (!alias) {
    throw new Error("The Dockerfile gives the server no --alias.");
  }
  return alias[1];
}
