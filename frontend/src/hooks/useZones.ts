import { useEffect, useState } from 'react';
import { fetchZones } from '../api/facilityApi';
import type { ZoneSummary } from '../types';

export function useZones() {
  const [zones, setZones] = useState<ZoneSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchZones().then((result) => {
      if (!cancelled) setZones(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return zones;
}
