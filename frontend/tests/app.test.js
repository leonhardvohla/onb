import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../src/App.vue", import.meta.url), "utf8");
const stylesSource = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("App search controls", () => {
  it("uses 50 as default sample size and does not offer 1000", () => {
    expect(appSource).toMatch(/const limit = ref\(50\);/);
    expect(appSource).toMatch(/const sizes = \[50, 100, 500\];/);
  });

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

  it("shows timeline meta from records that include year data", () => {
    expect(appSource).toMatch(/timelineRecordsCount/);
    expect(appSource).toMatch(/t\("timelineSummaryLabel",\s*\{/);
  });

  it("renders a header link to the GitHub repository", () => {
    expect(appSource).toMatch(/href="https:\/\/github\.com\/leonhardvohla\/onb"/);
    expect(appSource).toMatch(/target="_blank"/);
    expect(appSource).toMatch(/t\("repoLink"\)/);
    expect(stylesSource).toMatch(/\.repo-link\s*\{[\s\S]*color:\s*var\(--muted\);/);
  });
});
