<template>
  <div class="app">
    <header>
      <h1>Catalogue Through Time</h1>
      <p>
        Search the ONB catalogue and explore publication counts, authors, subjects,
        and languages by year.
      </p>
    </header>

    <div class="panel search">
      <input
        v-model.trim="query"
        @keyup.enter="search"
        placeholder="Search term or subject"
        aria-label="Search term"
      />
      <select v-model="field" aria-label="Field">
        <option value="any">Any field</option>
        <option value="subject">Subject</option>
        <option value="title">Title</option>
        <option value="author">Author</option>
      </select>
      <select v-model.number="limit" aria-label="Sample size">
        <option v-for="size in sizes" :key="size" :value="size">
          {{ size }} records
        </option>
      </select>
      <select v-model.number="page" aria-label="Page">
        <option v-for="p in pages" :key="p" :value="p">Page {{ p }}</option>
      </select>
      <button @click="search" :disabled="loading">
        {{ loading ? "Loading..." : "Search" }}
      </button>
    </div>

    <div class="panel timeline-card">
      <div class="timeline-header">
        <h2>Timeline</h2>
        <div class="meta">
          Sample size: up to {{ limit }} records. Total in catalogue:
          {{ total || "n/a" }}
        </div>
      </div>
      <TimelineChart :data="timelineData" v-model:range="range" />
      <div class="range-row">
        <span v-if="range">Selected range: {{ range[0] }} - {{ range[1] }}</span>
        <span v-else>No range selected</span>
        <button v-if="range" @click="clearRange">Clear range</button>
      </div>
      <div class="notice">{{ note }}</div>
      <div class="error" v-if="error">{{ error }}</div>
    </div>

    <div class="stats">
      <div class="panel">
        <h3>Top authors</h3>
        <ul>
          <li v-for="item in topAuthors" :key="item.value">
            <span>{{ item.value }}</span>
            <strong>{{ item.count }}</strong>
          </li>
        </ul>
      </div>
      <div class="panel">
        <h3>Top subjects</h3>
        <ul>
          <li v-for="item in topSubjects" :key="item.value">
            <span>{{ item.value }}</span>
            <strong>{{ item.count }}</strong>
          </li>
        </ul>
      </div>
      <div class="panel">
        <h3>Top languages</h3>
        <ul>
          <li v-for="item in topLanguages" :key="item.value">
            <span>{{ item.value }}</span>
            <strong>{{ item.count }}</strong>
          </li>
        </ul>
      </div>
    </div>

    <div class="panel records">
      <h3>
        Records ({{ displayRecords.length }} shown of
        {{ filteredRecords.length }})
      </h3>
      <div class="record-list">
        <div
          v-for="record in displayRecords"
          :key="record.id || record.title"
          class="record-item"
        >
          <div class="record-title">{{ record.title || "Untitled" }}</div>
          <div class="record-meta">
            {{ record.author || "Unknown" }} - {{ record.year || "n.d." }} -
            {{ record.language || "und" }}
          </div>
        </div>
      </div>
      <div class="notice" v-if="filteredRecords.length > recordLimit">
        Showing first {{ recordLimit }} records.
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import TimelineChart from "./components/TimelineChart.vue";
import { resolveApiBase } from "./lib/api";
import { buildTimelineData, filterRecordsByRange, topN } from "./lib/data";

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
const note = ref("");
const loading = ref(false);
const error = ref("");
const recordLimit = 30;

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
  note.value = "";
};

const readParams = () => {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("q");
  const fieldParam = params.get("field");
  const limitParam = params.get("size");
  const pageParam = params.get("page");
  if (q) query.value = q;
  if (fieldParam) field.value = fieldParam;
  if (limitParam) limit.value = Number(limitParam) || limit.value;
  if (pageParam) page.value = Math.max(1, Number(pageParam) || 1);
};

const updateParams = () => {
  const params = new URLSearchParams();
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

const search = async () => {
  if (!query.value) {
    error.value = "Enter a search term first.";
    clearResults();
    return;
  }
  normalizePage();
  loading.value = true;
  error.value = "";
  note.value = "";
  range.value = null;
  updateParams();

  try {
    const url = `${API_BASE}/api/search?q=${encodeURIComponent(
      query.value
    )}&field=${encodeURIComponent(field.value)}&maxRecords=${limit.value}&page=${page.value}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) {
      error.value = data.error || "Search failed.";
      clearResults();
      return;
    }
    records.value = data.records || [];
    total.value = data.total || 0;
    totalPages.value = data.totalPages || 0;
    note.value = data.note || "";
  } catch (err) {
    error.value = "Search failed.";
    clearResults();
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  readParams();
  if (!query.value) {
    query.value = "Grillparzer";
    field.value = "author";
    updateParams();
  }
  if (query.value) {
    search();
  }
});
</script>
