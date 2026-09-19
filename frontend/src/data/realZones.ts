// Generated from real sensor data - see data/README.md and
// data/build_zones.py in the repo root. This file is produced by that
// script, not hand-written: re-run `python data/build_zones.py` after
// changing data/raw/*.csv or the fault rules, then commit the refreshed
// lbnlZones.json.

import zonesJson from './lbnlZones.json';
import type { ZoneDetail } from '../types';

export const REAL_ZONES = zonesJson as ZoneDetail[];
