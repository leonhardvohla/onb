import { describe, expect, it } from "vitest";
import {
  buildTimelineData,
  filterRecordsByRange,
  findNearestTimelinePoint,
  topN
} from "../src/lib/data";

describe("buildTimelineData", () => {
  it("counts and sorts years", () => {
    const records = [
      { year: 2020 },
      { year: 2020 },
      { year: 2019 },
      { year: null },
      { year: 2021 }
    ];
    expect(buildTimelineData(records)).toEqual([
      { year: 2019, count: 1 },
      { year: 2020, count: 2 },
      { year: 2021, count: 1 }
    ]);
  });

  it("ignores non-numeric years", () => {
    const records = [{ year: "n.d." }, { year: "1901?" }, { year: 1902 }];
    expect(buildTimelineData(records)).toEqual([{ year: 1902, count: 1 }]);
  });
});

describe("filterRecordsByRange", () => {
  it("returns all records when range is missing", () => {
    const records = [{ year: 1990 }, { year: 2000 }];
    expect(filterRecordsByRange(records, null)).toEqual(records);
  });

  it("filters records by range", () => {
    const records = [{ year: 1990 }, { year: "1995" }, { year: "n.d." }, { year: 2000 }];
    expect(filterRecordsByRange(records, [1991, 1999])).toEqual([{ year: "1995" }]);
  });
});

describe("topN", () => {
  it("aggregates arrays and normalizes case", () => {
    const records = [
      { subjects: ["Art", "History"] },
      { subjects: ["art"] },
      { subjects: null }
    ];

    expect(topN(records, record => record.subjects)).toEqual([
      { value: "Art", count: 2 },
      { value: "History", count: 1 }
    ]);
  });
});

describe("findNearestTimelinePoint", () => {
  it("returns the nearest point to a target year", () => {
    const points = [
      { year: 1896, count: 1 },
      { year: 1901, count: 1 },
      { year: 1923, count: 2 }
    ];
    expect(findNearestTimelinePoint(points, 1903)).toEqual({ year: 1901, count: 1 });
  });

  it("returns the earlier year when distance is tied", () => {
    const points = [
      { year: 1896, count: 1 },
      { year: 1900, count: 3 }
    ];
    expect(findNearestTimelinePoint(points, 1898)).toEqual({ year: 1896, count: 1 });
  });

  it("returns null for empty data or invalid years", () => {
    expect(findNearestTimelinePoint([], 1900)).toBeNull();
    expect(findNearestTimelinePoint([{ year: 1900, count: 1 }], Number.NaN)).toBeNull();
  });
});
