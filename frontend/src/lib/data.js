export const buildTimelineData = records => {
  const counts = {};
  (records || []).forEach(record => {
    if (!record || !record.year) return;
    counts[record.year] = (counts[record.year] || 0) + 1;
  });
  return Object.keys(counts)
    .map(year => ({ year: Number(year), count: counts[year] }))
    .sort((a, b) => a.year - b.year);
};

export const filterRecordsByRange = (records, range) => {
  if (!range || range.length !== 2) return records || [];
  const [start, end] = range;
  return (records || []).filter(record => {
    return record && record.year && record.year >= start && record.year <= end;
  });
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
