import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../src/App.vue", import.meta.url), "utf8");

describe("App search controls", () => {
  it("auto-searches when search dropdowns change", () => {
    expect(appSource).toMatch(/v-model="field"[^>]*@change="searchOnControlChange"/);
    expect(appSource).toMatch(/v-model\.number="limit"[^>]*@change="searchOnControlChange"/);
    expect(appSource).toMatch(/v-model\.number="page"[^>]*@change="searchOnControlChange"/);
  });

  it("guards dropdown auto-search when there is no query or while loading", () => {
    expect(appSource).toMatch(
      /const searchOnControlChange = \(\) => \{\s*if \(!query\.value \|\| loading\.value\) return;\s*search\(\);\s*\};/
    );
  });
});
