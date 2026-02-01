export const buildTimelineData = records => {
  const counts = {};
  (records || []).forEach(record => {
    if (!record || record.year === null || record.year === undefined) return;
    const year = Number(record.year);
    if (!Number.isFinite(year)) return;
    counts[year] = (counts[year] || 0) + 1;
  });
  return Object.keys(counts)
    .map(year => ({ year: Number(year), count: counts[year] }))
    .sort((a, b) => a.year - b.year);
};

export const filterRecordsByRange = (records, range) => {
  if (!range || range.length !== 2) return records || [];
  const [start, end] = range;
  return (records || []).filter(record => {
    if (!record || record.year === null || record.year === undefined) return false;
    const year = Number(record.year);
    if (!Number.isFinite(year)) return false;
    return year >= start && year <= end;
  });
};

export const findNearestTimelinePoint = (timeline, year) => {
  const points = Array.isArray(timeline) ? timeline : [];
  if (!points.length || !Number.isFinite(year)) return null;

  let nearest = points[0];
  let distance = Math.abs(points[0].year - year);

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    const nextDistance = Math.abs(point.year - year);
    if (nextDistance < distance || (nextDistance === distance && point.year < nearest.year)) {
      nearest = point;
      distance = nextDistance;
    }
  }

  return nearest;
};

export const topN = (records, accessor, limit = 5) => {
  const counts = {};
  const display = {};

  (records || []).forEach(record => {
    if (!record) return;
    const value = accessor(record);
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(item => {
        if (!item) return;
        const key = item.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
        if (!display[key]) display[key] = item;
      });
      return;
    }
    const key = value.toLowerCase();
    counts[key] = (counts[key] || 0) + 1;
    if (!display[key]) display[key] = value;
  });

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value: display[value] || value, count }));
};
