<template>
  <div class="app">
    <header>
      <div class="header-row">
        <div class="header-text">
          <h1>{{ t("title") }}</h1>
          <p>{{ t("description") }}</p>
        </div>
        <div class="language-select">
          <label>
            <span>{{ t("languageLabel") }}</span>
            <select v-model="locale" :aria-label="t('languageAria')">
              <option v-for="option in localeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
      </div>
    </header>

    <div :class="['panel', 'search', { 'panel-loading': loading }]" :aria-busy="loading ? 'true' : 'false'">
      <input
        v-model.trim="query"
        @keyup.enter="search"
        :placeholder="t('searchPlaceholder')"
        :aria-label="t('searchAria')"
      />
      <select v-model="field" @change="searchOnControlChange" :aria-label="t('fieldAria')">
        <option value="any">{{ t("anyField") }}</option>
        <option value="subject">{{ t("subject") }}</option>
        <option value="title">{{ t("titleField") }}</option>
        <option value="author">{{ t("author") }}</option>
      </select>
      <select v-model.number="limit" @change="searchOnControlChange" :aria-label="t('sampleSizeAria')">
        <option v-for="size in sizes" :key="size" :value="size">
          {{ t("recordsCount", { count: size }) }}
        </option>
      </select>
      <select v-model.number="page" @change="searchOnControlChange" :aria-label="t('pageAria')">
        <option v-for="p in pages" :key="p" :value="p">
          {{ t("pageLabel", { page: p }) }}
        </option>
      </select>
      <button @click="search" :disabled="loading">
        {{ loading ? t("loading") : t("searchButton") }}
      </button>
    </div>

    <div
      :class="['panel', 'timeline-card', { 'panel-loading': loading }]"
      :aria-busy="loading ? 'true' : 'false'"
    >
      <div class="timeline-header">
        <h2>{{ t("timeline") }}</h2>
        <div class="meta">
          {{ t("sampleSizeLabel", { limit }) }}
          {{ t("totalLabel", { total: total || t("notAvailable") }) }}
        </div>
      </div>
      <div class="timeline-visual">
        <TimelineChart
          :data="timelineData"
          v-model:range="range"
          :empty-label="t('noTimelineData')"
          :tooltip-label="timelineTooltipLabel"
        />
        <div
          v-if="loading"
          class="timeline-loading-overlay"
          role="status"
          :aria-label="t('loading')"
        >
          <span class="timeline-spinner" aria-hidden="true"></span>
        </div>
      </div>
      <div class="range-row">
        <span v-if="range">
          {{ t("selectedRange", { start: range[0], end: range[1] }) }}
        </span>
        <span v-else>{{ t("noRangeSelected") }}</span>
        <button v-if="range" @click="clearRange">{{ t("clearRange") }}</button>
      </div>
      <div class="error" v-if="errorMessage">{{ errorMessage }}</div>
    </div>

    <div class="stats">
      <div :class="['panel', { 'panel-loading': loading }]" :aria-busy="loading ? 'true' : 'false'">
        <h3>{{ t("topAuthors") }}</h3>
        <ul>
          <li v-for="item in topAuthors" :key="item.value">
            <span>{{ item.value }}</span>
            <strong>{{ item.count }}</strong>
          </li>
        </ul>
      </div>
      <div :class="['panel', { 'panel-loading': loading }]" :aria-busy="loading ? 'true' : 'false'">
        <h3>{{ t("topSubjects") }}</h3>
        <ul>
          <li v-for="item in topSubjects" :key="item.value">
            <span>{{ item.value }}</span>
            <strong>{{ item.count }}</strong>
          </li>
        </ul>
      </div>
      <div :class="['panel', { 'panel-loading': loading }]" :aria-busy="loading ? 'true' : 'false'">
        <h3>{{ t("topLanguages") }}</h3>
        <ul>
          <li v-for="item in topLanguages" :key="item.value">
            <span>{{ item.value }}</span>
            <strong>{{ item.count }}</strong>
          </li>
        </ul>
      </div>
    </div>

    <div :class="['panel', 'records', { 'panel-loading': loading }]" :aria-busy="loading ? 'true' : 'false'">
      <h3>
        {{ t("recordsHeading", { shown: displayRecords.length, total: filteredRecords.length }) }}
      </h3>
      <div class="record-list">
        <div
          v-for="record in displayRecords"
          :key="record.id || record.title"
          class="record-item"
        >
          <div class="record-title">{{ record.title || t("untitled") }}</div>
          <div class="record-meta">
            {{ record.author || t("unknown") }} - {{ record.year || t("noDate") }} -
            {{ record.language || t("undetermined") }}
          </div>
        </div>
      </div>
      <div class="notice" v-if="filteredRecords.length > recordLimit">
        {{ t("showingFirst", { count: recordLimit }) }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import TimelineChart from "./components/TimelineChart.vue";
import { resolveApiBase } from "./lib/api";
import { buildTimelineData, filterRecordsByRange, topN } from "./lib/data";
import {
  normalizeLocale,
  resolveInitialLocale,
  resolveLocale,
  storeLocale,
  translate
} from "./lib/i18n";

const API_BASE = resolveApiBase(import.meta.env, import.meta.env.DEV);

const query = ref("");
const field = ref("any");
const limit = ref(100);
const page = ref(1);
const sizes = [50, 100, 500, 1000];
const totalPages = ref(0);
const total = ref(0);
const records = ref([]);
const range = ref(null);
const loading = ref(false);
const recordLimit = 30;
const ready = ref(false);

const locale = ref(resolveInitialLocale());
const localeOptions = [
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" }
];

const t = (key, params) => translate(locale.value, key, params);
const timelineTooltipLabel = point => {
  const count = Number(point?.count) || 0;
  const key = count === 1 ? "timelineEntryInYearSingular" : "timelineEntryInYearPlural";
  return t(key, { count, year: point.year });
};

const timelineData = computed(() => buildTimelineData(records.value));
const filteredRecords = computed(() =>
  filterRecordsByRange(records.value, range.value)
);
const topAuthors = computed(() => topN(filteredRecords.value, r => r.author));
const topSubjects = computed(() => topN(filteredRecords.value, r => r.subjects));
const topLanguages = computed(() => topN(filteredRecords.value, r => r.language));
const displayRecords = computed(() =>
  filteredRecords.value.slice(0, recordLimit)
);

const pages = computed(() => {
  const totalValue = totalPages.value || 0;
  const count = totalValue || 1;
  const current = Math.max(1, Math.min(page.value, count));
  const start = Math.max(1, current - 5);
  const end = Math.min(count, current + 5);
  const windowed = Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  const values = [1, ...windowed, count];
  return Array.from(new Set(values)).filter(p => p >= 1 && p <= count);
});

const clearRange = () => {
  range.value = null;
};

const clearResults = () => {
  records.value = [];
  total.value = 0;
  totalPages.value = 0;
};

const readParams = () => {
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get("lang");
  const q = params.get("q");
  const fieldParam = params.get("field");
  const limitParam = params.get("size");
  const pageParam = params.get("page");
  const normalizedLang = normalizeLocale(langParam);
  if (normalizedLang) locale.value = normalizedLang;
  if (q) query.value = q;
  if (fieldParam) field.value = fieldParam;
  if (limitParam) limit.value = Number(limitParam) || limit.value;
  if (pageParam) page.value = Math.max(1, Number(pageParam) || 1);
};

const updateParams = () => {
  const params = new URLSearchParams();
  if (locale.value) params.set("lang", locale.value);
  if (query.value) params.set("q", query.value);
  if (field.value && field.value !== "any") params.set("field", field.value);
  if (limit.value) params.set("size", String(limit.value));
  if (page.value && page.value > 1) params.set("page", String(page.value));
  const queryString = params.toString();
  const newUrl = queryString
    ? `${window.location.pathname}?${queryString}`
    : window.location.pathname;
  window.history.replaceState({}, "", newUrl);
};

const normalizePage = () => {
  if (!page.value || page.value < 1) page.value = 1;
  page.value = Math.floor(page.value);
};

const syncLocale = value => {
  const normalized = resolveLocale(value);
  if (normalized !== value) {
    locale.value = normalized;
    return;
  }
  storeLocale(normalized);
  document.documentElement.lang = normalized;
  document.title = translate(normalized, "pageTitle");
};

watch(locale, value => {
  syncLocale(value);
  if (ready.value) updateParams();
});

const errorKey = ref("");
const errorDetail = ref("");
const errorMessage = computed(() => {
  if (errorDetail.value) return errorDetail.value;
  if (errorKey.value) return t(errorKey.value);
  return "";
});

const searchOnControlChange = () => {
  if (!query.value || loading.value) return;
  search();
};

const search = async () => {
  if (!query.value) {
    errorKey.value = "enterSearchTerm";
    errorDetail.value = "";
    clearResults();
    return;
  }
  normalizePage();
  loading.value = true;
  errorKey.value = "";
  errorDetail.value = "";
  range.value = null;
  updateParams();

  try {
    const url = `${API_BASE}/api/search?q=${encodeURIComponent(
      query.value
    )}&field=${encodeURIComponent(field.value)}&maxRecords=${limit.value}&page=${page.value}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      errorDetail.value = data.error || "";
      errorKey.value = data.error ? "" : "searchFailed";
      clearResults();
      return;
    }
    records.value = data.records || [];
    total.value = data.total || 0;
    totalPages.value = data.totalPages || 0;
  } catch (err) {
    errorKey.value = "searchFailed";
    errorDetail.value = "";
    clearResults();
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  readParams();
  syncLocale(locale.value);
  ready.value = true;
  if (!query.value) {
    query.value = "Rilke";
    field.value = "author";
    updateParams();
  }
  if (query.value) {
    search();
  }
});
</script>
