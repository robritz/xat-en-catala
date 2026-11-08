// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { servedName } from "./served-name.js";

const dockerfile = (model) =>
  readFileSync(new URL(`../../../model/${model}/Dockerfile`, import.meta.url), "utf8");

describe("servedName", () => {
  it("reads the name each model's server is given as its alias", () => {
    expect(servedName(dockerfile("salamandra"))).toBe("BSC-LT/salamandra-7b-instruct-2606");
    expect(servedName(dockerfile("alia"))).toBe("BSC-LT/ALIA-40b-instruct-2601");
  });

  it("names the problem when a Dockerfile gives no alias", () => {
    expect(() => servedName('CMD [ "--model", "/models/m.gguf" ]')).toThrow(
      "The Dockerfile gives the server no --alias.",
    );
  });
});
