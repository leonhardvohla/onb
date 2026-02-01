import { describe, expect, it } from "vitest";
import { resolveApiBase } from "../src/lib/api";

describe("resolveApiBase", () => {
  it("returns empty in dev even when env is set", () => {
    const env = { VITE_API_BASE: "http://example.test" };
    expect(resolveApiBase(env, true)).toBe("");
  });

  it("uses env value in prod and trims trailing slashes", () => {
    const env = { VITE_API_BASE: "http://example.test/" };
    expect(resolveApiBase(env, false)).toBe("http://example.test");
  });

  it("returns empty when env is missing", () => {
    expect(resolveApiBase({}, false)).toBe("");
  });
});
