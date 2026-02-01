export const SUPPORTED_LOCALES = ["en", "de"];
export const DEFAULT_LOCALE = "en";
export const STORAGE_KEY = "ctt-locale";

const MESSAGES = {
  en: {
    pageTitle: "Catalogue Through Time - ONB SRU Demo",
    title: "Catalogue Through Time",
    description:
      "Search the ONB catalogue and explore publication counts, authors, subjects, and languages by year.",
    searchPlaceholder: "Search term or subject",
    searchAria: "Search term",
    fieldAria: "Field",
    anyField: "Any field",
    subject: "Subject",
    titleField: "Title",
    author: "Author",
    sampleSizeAria: "Sample size",
    recordsCount: "{count} records",
    pageAria: "Page",
    pageLabel: "Page {page}",
    searchButton: "Search",
    loading: "Loading...",
    timeline: "Timeline",
    sampleSizeLabel: "Sample size: up to {limit} records.",
    timelineSummaryLabel:
      "{count} records shown. Total in catalouge: {total}",
    totalLabel: "Total in catalogue: {total}",
    notAvailable: "n/a",
    selectedRange: "Selected range: {start} - {end}",
    noRangeSelected: "No range selected",
    clearRange: "Clear range",
    topAuthors: "Top authors",
    topSubjects: "Top subjects",
    topLanguages: "Top languages",
    recordsHeading: "Records ({shown} shown of {total})",
    untitled: "Untitled",
    unknown: "Unknown",
    noDate: "n.d.",
    undetermined: "und",
    showingFirst: "Showing first {count} records.",
    enterSearchTerm: "Enter a search term first.",
    searchFailed: "Search failed.",
    noTimelineData: "No timeline data yet.",
    timelineEntryInYearSingular: "{count} entry in {year}",
    timelineEntryInYearPlural: "{count} entries in {year}",
    languageLabel: "Language",
    languageAria: "Language"
  },
  de: {
    pageTitle: "Katalog durch die Zeit - ÖNB SRU Demo",
    title: "Katalog durch die Zeit",
    description:
      "Durchsuchen Sie den ÖNB-Katalog und erkunden Sie Veröffentlichungszahlen, Autorinnen und Autoren, Schlagwörter und Sprachen nach Jahr.",
    searchPlaceholder: "Suchbegriff oder Schlagwort",
    searchAria: "Suchbegriff",
    fieldAria: "Feld",
    anyField: "Beliebiges Feld",
    subject: "Schlagwort",
    titleField: "Titel",
    author: "Autor",
    sampleSizeAria: "Stichprobe",
    recordsCount: "{count} Einträge",
    pageAria: "Seite",
    pageLabel: "Seite {page}",
    searchButton: "Suchen",
    loading: "Lädt...",
    timeline: "Zeitstrahl",
    sampleSizeLabel: "Stichprobe: bis zu {limit} Einträge.",
    timelineSummaryLabel:
      "{count} Einträge angezeigt. Insgesamt im Katalog: {total}",
    totalLabel: "Gesamt im Katalog: {total}",
    notAvailable: "k. A.",
    selectedRange: "Ausgewählter Bereich: {start} - {end}",
    noRangeSelected: "Kein Bereich ausgewählt",
    clearRange: "Bereich löschen",
    topAuthors: "Top-Autoren",
    topSubjects: "Top-Schlagwörter",
    topLanguages: "Top-Sprachen",
    recordsHeading: "Einträge ({shown} von {total} angezeigt)",
    untitled: "Ohne Titel",
    unknown: "Unbekannt",
    noDate: "o. J.",
    undetermined: "und",
    showingFirst: "Es werden die ersten {count} Einträge angezeigt.",
    enterSearchTerm: "Bitte zuerst einen Suchbegriff eingeben.",
    searchFailed: "Suche fehlgeschlagen.",
    noTimelineData: "Noch keine Zeitstrahl-Daten.",
    timelineEntryInYearSingular: "{count} Eintrag im Jahr {year}",
    timelineEntryInYearPlural: "{count} Einträge im Jahr {year}",
    languageLabel: "Sprache",
    languageAria: "Sprache"
  }
};

export const normalizeLocale = value => {
  if (!value || typeof value !== "string") return null;
  const short = value.toLowerCase().split(/[_-]/)[0];
  return SUPPORTED_LOCALES.includes(short) ? short : null;
};

export const resolveLocale = value => normalizeLocale(value) || DEFAULT_LOCALE;

export const getLocaleFromSearch = (search = "") => {
  if (!search) return null;
  const params = new URLSearchParams(search);
  return normalizeLocale(params.get("lang"));
};

export const getStoredLocale = storage => {
  if (!storage) return null;
  try {
    return normalizeLocale(storage.getItem(STORAGE_KEY));
  } catch (err) {
    return null;
  }
};

export const storeLocale = (locale, storage = null) => {
  const target = storage || (typeof localStorage !== "undefined" ? localStorage : null);
  if (!target) return;
  try {
    target.setItem(STORAGE_KEY, locale);
  } catch (err) {
    // ignore storage failures
  }
};

export const getNavigatorLocales = nav => {
  if (!nav) return [];
  const locales = [];
  if (Array.isArray(nav.languages)) locales.push(...nav.languages);
  if (nav.language) locales.push(nav.language);
  return locales.filter(Boolean);
};

export const pickLocale = locales => {
  const list = Array.isArray(locales) ? locales : [];
  for (const locale of list) {
    const normalized = normalizeLocale(locale);
    if (normalized) return normalized;
  }
  return DEFAULT_LOCALE;
};

export const resolveInitialLocale = ({
  search = typeof window !== "undefined" ? window.location.search : "",
  storage = typeof localStorage !== "undefined" ? localStorage : null,
  navigator: nav = typeof navigator !== "undefined" ? navigator : null
} = {}) => {
  const fromSearch = getLocaleFromSearch(search);
  if (fromSearch) return fromSearch;
  const fromStorage = getStoredLocale(storage);
  if (fromStorage) return fromStorage;
  return pickLocale(getNavigatorLocales(nav));
};

export const translate = (locale, key, params = {}) => {
  const normalized = resolveLocale(locale);
  const dictionary = MESSAGES[normalized] || {};
  const fallback = MESSAGES[DEFAULT_LOCALE] || {};
  const template = dictionary[key] ?? fallback[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const value = params[name];
    return value === undefined || value === null ? "" : String(value);
  });
};

export const messages = MESSAGES;
