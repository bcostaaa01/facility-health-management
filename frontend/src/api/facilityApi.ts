// Stand-in for real HTTP calls to the FastAPI backend. Every function here
// returns a Promise with the same shape the real endpoints will use:
//   GET /buildings/zones      -> fetchZones()
//   GET /zones/{zoneId}       -> fetchZoneDetail(zoneId)
//   POST /import              -> importZones(zones)
// When the backend exists, only the bodies of these functions change
// (fetch() instead of reading/mutating the in-memory store) - callers
// stay the same.
//
// The baseline data is real: see data/README.md for where it comes from
// and data/build_zones.py for how the fault flags were computed.

import { REAL_ZONES } from '../data/realZones';
import type { ZoneDetail, ZoneSummary } from '../types';

const MOCK_LATENCY_MS = 250;

// In-memory only - there's no database yet, so this resets on page reload.
// A real POST /import would persist this server-side instead.
let zones: ZoneDetail[] = [...REAL_ZONES];

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), MOCK_LATENCY_MS));
}

export async function fetchZones(): Promise<ZoneSummary[]> {
  return delay(zones.map(({ sensorTrend: _sensorTrend, ...summary }) => summary));
}

export async function fetchZoneDetail(zoneId: string): Promise<ZoneDetail | undefined> {
  return delay(zones.find((zone) => zone.id === zoneId));
}

export async function importZones(newZones: ZoneDetail[]): Promise<void> {
  const incomingIds = new Set(newZones.map((zone) => zone.id));
  zones = [...zones.filter((zone) => !incomingIds.has(zone.id)), ...newZones];
  await delay(undefined);
}
