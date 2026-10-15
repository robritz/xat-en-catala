import { expect, test } from "vitest";

// Deliberately fails, to see CI fail. Reverted straight after.
test("a deliberately failing test", () => {
  expect(1).toBe(2);
});
