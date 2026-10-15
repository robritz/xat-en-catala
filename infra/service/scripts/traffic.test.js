// @vitest-environment node
import { describe, expect, it } from "vitest";
import { servingRevision } from "./traffic.js";

const service = (...traffic) => ({ metadata: { name: "model-host" }, status: { traffic } });

describe("servingRevision", () => {
  it("is empty when there is no service yet", () => {
    expect(servingRevision([])).toBe("");
  });

  it("names the revision taking all traffic", () => {
    expect(
      servingRevision([
        service({ revisionName: "model-host-00002-abc", percent: 100, latestRevision: true }),
      ]),
    ).toBe("model-host-00002-abc");
  });

  it("names it while a candidate that failed its message takes none", () => {
    expect(
      servingRevision([
        service(
          { revisionName: "model-host-00002-abc", percent: 100 },
          { revisionName: "model-host-00003-def", latestRevision: true, tag: "candidate" },
        ),
      ]),
    ).toBe("model-host-00002-abc");
  });

  it("names it when it is reached both by name and as the latest", () => {
    expect(
      servingRevision([
        service(
          { revisionName: "model-host-00002-abc", percent: 100 },
          { revisionName: "model-host-00002-abc", percent: 0, latestRevision: true, tag: "candidate" },
        ),
      ]),
    ).toBe("model-host-00002-abc");
  });

  it("refuses traffic split between revisions, which nothing here makes", () => {
    expect(() =>
      servingRevision([
        service(
          { revisionName: "model-host-00002-abc", percent: 50 },
          { revisionName: "model-host-00003-def", percent: 50 },
        ),
      ]),
    ).toThrow("No revision of model-host takes all its traffic.");
  });
});
