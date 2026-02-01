import { describe, expect, it } from "vitest";
import { normalizeLocale, resolveInitialLocale, translate } from "../src/lib/i18n";

describe("normalizeLocale", () => {
  it("returns supported short locale codes", () => {
    expect(normalizeLocale("de-AT")).toBe("de");
    expect(normalizeLocale("EN")).toBe("en");
  });

  it("returns null for unsupported locales", () => {
    expect(normalizeLocale("fr")).toBeNull();
  });
});

describe("resolveInitialLocale", () => {
  it("prefers the lang search param", () => {
    const locale = resolveInitialLocale({
      search: "?lang=de",
      storage: { getItem: () => "en" },
      navigator: { languages: ["en-US"], language: "en-US" }
    });
    expect(locale).toBe("de");
  });

  it("falls back to stored locale", () => {
    const locale = resolveInitialLocale({
      search: "",
      storage: { getItem: () => "de" },
      navigator: { languages: ["en-US"], language: "en-US" }
    });
    expect(locale).toBe("de");
  });

  it("ignores unsupported lang params and keeps fallback order", () => {
    const locale = resolveInitialLocale({
      search: "?lang=fr",
      storage: { getItem: () => "de" },
      navigator: { languages: ["en-US"], language: "en-US" }
    });
    expect(locale).toBe("de");
  });

  it("falls back to navigator locales", () => {
    const locale = resolveInitialLocale({
      search: "",
      storage: { getItem: () => null },
      navigator: { languages: ["en-US"], language: "en-US" }
    });
    expect(locale).toBe("en");
  });
});

describe("translate", () => {
  it("replaces tokens", () => {
    expect(translate("de", "recordsCount", { count: 5 })).toBe("5 Einträge");
    expect(translate("en", "timelineSummaryLabel", { count: 42, total: 2095 })).toBe(
      "42 records with year data shown. Total search results in catalouge: 2095"
    );
    expect(translate("de", "timelineSummaryLabel", { count: 42, total: 2095 })).toBe(
      "42 Einträge mit Jahresangabe angezeigt. Suchergebnisse insgesamt im Katalog: 2095"
    );
  });

  it("builds localized timeline tooltip labels with singular/plural forms", () => {
    expect(translate("en", "timelineEntryInYearSingular", { count: 1, year: 1899 })).toBe(
      "1 entry in 1899"
    );
    expect(translate("en", "timelineEntryInYearPlural", { count: 2, year: 1899 })).toBe(
      "2 entries in 1899"
    );
    expect(translate("de", "timelineEntryInYearSingular", { count: 1, year: 1899 })).toBe(
      "1 Eintrag im Jahr 1899"
    );
    expect(translate("de", "timelineEntryInYearPlural", { count: 2, year: 1899 })).toBe(
      "2 Einträge im Jahr 1899"
    );
  });

  it("falls back to English for unsupported locales", () => {
    expect(translate("fr", "searchButton")).toBe("Search");
  });
});
