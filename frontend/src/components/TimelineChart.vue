<template>
  <div ref="container" class="timeline-chart"></div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as d3 from "d3";

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  range: {
    type: Array,
    default: null
  },
  emptyLabel: {
    type: String,
    default: "No timeline data yet."
  }
});

const emit = defineEmits(["update:range"]);

const container = ref(null);
let resizeObserver = null;
let renderPending = false;

const scheduleRender = () => {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    render();
  });
};

const render = () => {
  const el = container.value;
  if (!el) return;
  const data = Array.isArray(props.data) ? props.data : [];
  el.innerHTML = "";

  if (!data.length) {
    const notice = document.createElement("div");
    notice.className = "notice";
    notice.textContent = props.emptyLabel || "No timeline data yet.";
    el.appendChild(notice);
    return;
  }

  const outerWidth = el.clientWidth;
  const outerHeight = el.clientHeight;
  if (!outerWidth || !outerHeight) return;

  const margin = { top: 20, right: 18, bottom: 30, left: 36 };
  const width = outerWidth - margin.left - margin.right;
  const height = outerHeight - margin.top - margin.bottom;
  if (width <= 0 || height <= 0) return;

  const svg = d3
    .select(el)
    .append("svg")
    .attr("width", outerWidth)
    .attr("height", outerHeight);

  const chart = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const years = data.map(d => d.year);
  const minYear = d3.min(years);
  const maxYear = d3.max(years);
  const xDomain =
    minYear === maxYear ? [minYear - 1, maxYear + 1] : [minYear, maxYear];
  const x = d3.scaleLinear().domain(xDomain).range([0, width]);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .nice()
    .range([height, 0]);

  const barWidth = Math.max(1, Math.min(2, width / data.length - 1));

  chart
    .append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).ticks(Math.min(10, data.length)).tickFormat(d3.format("d")));

  chart.append("g").call(d3.axisLeft(y).ticks(4));

  chart
    .selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", d => x(d.year) - barWidth / 2)
    .attr("y", d => y(d.count))
    .attr("width", barWidth)
    .attr("height", d => height - y(d.count))
    .attr("fill", "#d87b35")
    .attr("opacity", 0.85);

  const brush = d3
    .brushX()
    .extent([
      [0, 0],
      [width, height]
    ])
    .on("end", event => {
      if (!event.selection) {
        emit("update:range", null);
        return;
      }
      const [x0, x1] = event.selection;
      const start = Math.round(x.invert(x0));
      const end = Math.round(x.invert(x1));
      emit("update:range", [Math.min(start, end), Math.max(start, end)]);
    });

  const brushGroup = chart.append("g").attr("class", "brush").call(brush);

  if (props.range && props.range.length === 2) {
    brushGroup.call(brush.move, [x(props.range[0]), x(props.range[1])]);
  }
};

watch(
  () => [props.data, props.range, props.emptyLabel],
  () => {
    scheduleRender();
  },
  { deep: true }
);

onMounted(() => {
  if (container.value) {
    resizeObserver = new ResizeObserver(() => scheduleRender());
    resizeObserver.observe(container.value);
  }
  scheduleRender();
});

onBeforeUnmount(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
});
</script>
