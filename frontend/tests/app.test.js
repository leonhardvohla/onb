import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const appSource = readFileSync(new URL("../src/App.vue", import.meta.url), "utf8");
const indexSource = readFileSync(new URL("../index.html", import.meta.url), "utf8");
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

  it("uses edge-to-edge viewport and safe-area-aware layout for iOS", () => {
    expect(indexSource).toMatch(/viewport-fit=cover/);
    expect(indexSource).toMatch(/meta name="theme-color" content="#fcebd6"/);
    expect(indexSource).toMatch(/prefers-color-scheme: light/);
    expect(indexSource).toMatch(/prefers-color-scheme: dark/);
    expect(stylesSource).toMatch(/--top-chrome:\s*#fcebd6;/);
    expect(stylesSource).toMatch(/html\s*\{[\s\S]*background-color:\s*var\(--top-chrome\);/);
    expect(stylesSource).toMatch(/body\s*\{[\s\S]*background:\s*transparent;/);
    expect(stylesSource).toMatch(/min-height:\s*100dvh;/);
    expect(stylesSource).toMatch(/env\(safe-area-inset-top,\s*0px\)/);
    expect(stylesSource).toMatch(/env\(safe-area-inset-right,\s*0px\)/);
    expect(stylesSource).toMatch(/env\(safe-area-inset-bottom,\s*0px\)/);
    expect(stylesSource).toMatch(/env\(safe-area-inset-left,\s*0px\)/);
  });

  it("uses shrinkable grid tracks so cards reflow on resize/orientation change", () => {
    expect(stylesSource).toMatch(/\.app\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(stylesSource).toMatch(/\.app\s*>\s*\*\s*\{[\s\S]*min-width:\s*0;/);
    expect(stylesSource).toMatch(/\.panel\s*\{[\s\S]*min-width:\s*0;/);
    expect(stylesSource).toMatch(/\.timeline-card\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(stylesSource).toMatch(/\.timeline-card\s*>\s*\*\s*\{[\s\S]*min-width:\s*0;/);
  });

  it("uses smaller timeline axis labels on narrow mobile screens", () => {
    expect(stylesSource).toMatch(
      /@media\s*\(max-width:\s*700px\)\s*\{[\s\S]*\.timeline-chart svg text\s*\{[\s\S]*font-size:\s*7px;/
    );
  });
});
