// Mutation testing: Stryker changes the code in small ways, one change at a
// time, and runs the tests against each change. A change that no test fails
// on shows code the tests do not check. Run it with `npm run test:mutation`;
// the report is written to reports/mutation/mutation.html.

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.mts" },
  // Runs only the tests that reach the changed code, not every test.
  coverageAnalysis: "perTest",
  mutate: ["src/**/*.{ts,tsx}", "!src/**/*.test.{ts,tsx}"],
  reporters: ["html", "clear-text", "progress"],
  // The app's tests need none of these, and Terraform's provider cache under
  // infra/ cannot be copied into the sandbox.
  ignorePatterns: ["infra", "model", "docs", ".scratch", ".next"],
  // Keeps the run's copies of the project inside the repository.
  tempDirName: ".stryker-tmp",
};

export default config;
