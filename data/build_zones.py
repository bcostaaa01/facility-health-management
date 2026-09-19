"""Convert raw LBNL SDAHU sensor slices into the ZoneDetail[] shape the
frontend expects (see frontend/src/types.ts).

This is a preview of what backend/fault_detection.py will do for real once
the FastAPI service exists: read raw time-series rows, compare actual
actuator position against commanded position, and flag a fault when they
disagree for a sustained period. Run it whenever a new raw slice is added
under data/raw/.

    python data/build_zones.py
"""

import csv
import json
from pathlib import Path

RAW_DIR = Path(__file__).parent / "raw"
OUT_PATH = Path(__file__).parent.parent / "frontend" / "src" / "data" / "lbnlZones.json"

# Each scenario is one real annual simulation run from the LBNL SDAHU FDD
# dataset (see data/README.md), sliced to its first ~49 hours. The whole
# slice reflects one persistent condition - these are not synthetic
# injected-window anomalies, they are what LBNL actually simulated for
# that fault case.
SCENARIOS = [
    {
        "file": "sdahu_baseline_jan1-3.csv",
        "building_id": "lbnl-baseline",
        "building_name": "LBNL SDAHU - Normal Operation",
    },
    {
        "file": "sdahu_damper_stuck_075_jan1-3.csv",
        "building_id": "lbnl-damper-stuck",
        "building_name": "LBNL SDAHU - Damper Stuck Case",
    },
    {
        "file": "sdahu_coi_leakage_025_jan1-3.csv",
        "building_id": "lbnl-coil-leak",
        "building_name": "LBNL SDAHU - Coil Valve Leak Case",
    },
]

FAULT_INFO = {
    "stuck_damper": {
        "severity": "high",
        "summary": "Outside-air damper stuck near 75% open",
        "explanation": (
            "OA_DMPR (the outside-air damper's actual position) holds at 75% "
            "open for the entire window while OA_DMPR_DM (the commanded "
            "position sent by the controller) stays at 0%. The damper isn't "
            "responding to the control signal at all, so the AHU keeps "
            "pulling in far more outside air than it should."
        ),
        "cost_per_month": 410,
    },
    "valve_leak_by": {
        "severity": "medium",
        "summary": "Chilled water valve leaking by when it should be shut",
        "explanation": (
            "CHWC_VLV (the chilled water coil valve's actual position) sits "
            "around 10% open even though CHWC_VLV_DM (the commanded "
            "position) is 0%. A small amount of chilled water keeps passing "
            "through, quietly cooling the supply air and wasting energy "
            "while the coil appears fully closed."
        ),
        "cost_per_month": 180,
    },
}

ZONE_COLUMNS = ["ZONE_TEMP_1", "ZONE_TEMP_2", "ZONE_TEMP_3", "ZONE_TEMP_4", "ZONE_TEMP_5"]
HOURLY_STRIDE = 60  # raw data is 1-minute resolution; sample once per hour


def load_rows(path: Path) -> list[dict]:
    with path.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def mean(values: list[float]) -> float:
    return sum(values) / len(values)


def detect_fault(rows: list[dict]) -> str | None:
    """Same rule the browser-side importer runs (frontend/src/lib/sdahuImport.ts) -
    keep the two in sync."""
    damper_gap = mean([abs(float(r["OA_DMPR"]) - float(r["OA_DMPR_DM"])) for r in rows])
    if damper_gap > 0.2:
        return "stuck_damper"

    # Compare actual vs. commanded valve position only when demand calls for
    # fully closed - averaging over the whole window dilutes the signal
    # whenever demand legitimately opens the valve elsewhere in the file.
    closed_rows = [r for r in rows if float(r["CHWC_VLV_DM"]) < 0.02]
    if len(closed_rows) > len(rows) * 0.2:
        actual_when_closed = mean([float(r["CHWC_VLV"]) for r in closed_rows])
        if actual_when_closed > 0.03:
            return "valve_leak_by"

    return None


def to_reading(row: dict, zone_col: str) -> dict:
    valve_pct = max(0.0, float(row["CHWC_VLV"])) * 100
    damper_pct = max(0.0, float(row["OA_DMPR"])) * 100
    return {
        "timestamp": row["Datetime"].replace(" ", "T") + "Z",
        "zoneTempF": round(float(row[zone_col]), 1),
        "setpointF": round(float(row["SA_TEMPSPT"]), 1),
        "damperPositionPct": round(damper_pct),
        "valveOpenPct": round(valve_pct),
        "mode": "cooling" if valve_pct > 5 else "idle",
    }


def build_fault(fault_type: str, detected_at: str) -> dict:
    info = FAULT_INFO[fault_type]
    return {
        "id": fault_type,
        "type": fault_type,
        "severity": info["severity"],
        "summary": info["summary"],
        "explanation": info["explanation"],
        "detectedAt": detected_at,
        "estimatedCostPerMonth": info["cost_per_month"],
    }


def build_zone(scenario: dict, rows: list[dict], zone_index: int, fault_type: str | None) -> dict:
    zone_col = ZONE_COLUMNS[zone_index]
    sampled = rows[::HOURLY_STRIDE]
    trend = [to_reading(row, zone_col) for row in sampled]
    faults = []
    if fault_type:
        faults = [build_fault(fault_type, trend[-1]["timestamp"])]
    return {
        "id": f"{scenario['building_id']}-zone-{zone_index + 1}",
        "name": f"Zone {zone_index + 1}",
        "buildingId": scenario["building_id"],
        "buildingName": scenario["building_name"],
        "healthStatus": "critical" if faults and faults[0]["severity"] == "high"
        else "warning" if faults else "healthy",
        "faults": faults,
        "sensorTrend": trend,
    }


def main() -> None:
    zones = []
    for scenario in SCENARIOS:
        rows = load_rows(RAW_DIR / scenario["file"])
        fault_type = detect_fault(rows)
        print(f"{scenario['building_name']}: {fault_type or 'healthy'}")
        for zone_index in range(len(ZONE_COLUMNS)):
            zones.append(build_zone(scenario, rows, zone_index, fault_type))

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(zones, indent=2), encoding="utf-8")
    print(f"wrote {len(zones)} zones to {OUT_PATH}")


if __name__ == "__main__":
    main()
