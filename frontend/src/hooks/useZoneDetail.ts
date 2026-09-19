import { useEffect, useState } from 'react';
import { fetchZoneDetail } from '../api/facilityApi';
import type { ZoneDetail } from '../types';

export function useZoneDetail(zoneId: string | undefined) {
  const [zone, setZone] = useState<ZoneDetail | null | undefined>(null);

  useEffect(() => {
    if (!zoneId) return;
    let cancelled = false;
    setZone(null);
    fetchZoneDetail(zoneId).then((result) => {
      if (!cancelled) setZone(result);
    });
    return () => {
      cancelled = true;
    };
  }, [zoneId]);

  return zone;
}
