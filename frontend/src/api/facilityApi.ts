// Stand-in for real HTTP calls to the FastAPI backend. Every function here
// returns a Promise with the same shape the real endpoints will use:
//   GET /buildings/zones      -> fetchZones()
//   GET /zones/{zoneId}       -> fetchZoneDetail(zoneId)
// When the backend exists, only the bodies of these two functions change
// (fetch() instead of reading MOCK_ZONES) - callers stay the same.

import { MOCK_ZONES } from '../data/mockZones';
import type { ZoneDetail, ZoneSummary } from '../types';

const MOCK_LATENCY_MS = 250;

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS));
}

export async function fetchZones(): Promise<ZoneSummary[]> {
  return delay(
    MOCK_ZONES.map(({ sensorTrend: _sensorTrend, ...summary }) => summary),
  );
}

export async function fetchZoneDetail(zoneId: string): Promise<ZoneDetail | undefined> {
  return delay(MOCK_ZONES.find((zone) => zone.id === zoneId));
}
