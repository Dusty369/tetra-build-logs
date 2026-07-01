import { describe, it, expect } from "vitest";
import { haversineMetres } from "../haversine";

// Job at Trafalgar Square, London: 51.508090, -0.128022
const JOB_LAT = 51.508090;
const JOB_LNG = -0.128022;

describe("haversineMetres", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineMetres(JOB_LAT, JOB_LNG, JOB_LAT, JOB_LNG)).toBeCloseTo(0, 0);
  });

  it("matches a recording ~50 m away", () => {
    // ~50m north of the job: shift lat by ~0.00045 degrees
    const recordLat = JOB_LAT + 0.00045;
    const dist = haversineMetres(JOB_LAT, JOB_LNG, recordLat, JOB_LNG);
    expect(dist).toBeLessThan(150);
    expect(dist).toBeGreaterThan(0);
  });

  it("does not match a recording ~500 m away", () => {
    // ~500m north: shift lat by ~0.0045 degrees
    const recordLat = JOB_LAT + 0.0045;
    const dist = haversineMetres(JOB_LAT, JOB_LNG, recordLat, JOB_LNG);
    expect(dist).toBeGreaterThan(150);
  });
});
