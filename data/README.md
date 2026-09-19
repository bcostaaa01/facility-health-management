# Data

## Source

Real sensor data from the **LBNL Fault Detection and Diagnostics Datasets**
(single-duct AHU subset), published by Lawrence Berkeley National
Laboratory via the DOE Open Energy Data Initiative:

- Dataset: https://data.openei.org/submissions/5763 (DOI 10.25984/1881324)
- Raw files: https://fdddata.lbl.gov/data/Simulated_LBNL_FDD_Data_Sets_SDAHU/
- Companion paper: "A labeled dataset for building HVAC systems operating
  in faulted and fault-free states," *Scientific Data* (2023)

Each annual CSV in the original dataset is a full year of a simulated
single-duct AHU (1-minute resolution) run under one specific, persistent
fault condition, alongside one fault-free baseline run. This project only
uses a ~49 hour slice (`data/raw/*.csv`) of three of those runs, not the
full 580MB archive:

| Raw file | Original LBNL file | Condition |
|---|---|---|
| `sdahu_baseline_jan1-3.csv` | `AHU_annual.csv` | Fault-free baseline |
| `sdahu_damper_stuck_075_jan1-3.csv` | `damper_stuck_075_annual.csv` | Outside-air damper stuck at 75% open |
| `sdahu_coi_leakage_025_jan1-3.csv` | `coi_leakage_025_annual.csv` | Chilled water coil valve leaking by |

The full archive has more fault types (coil/damper stuck at other
severities, coil and outside-air sensor bias) if you want to slice out
more scenarios later - see `build_zones.py`'s `SCENARIOS` list.

## Columns that matter for this project

The AHU serves 5 zones (`ZONE_TEMP_1`..`ZONE_TEMP_5`) through one shared
damper and one shared cooling valve, so a fault at the AHU shows up
identically across all 5 zones in this slice - that's realistic: a lot of
real HVAC faults live at shared equipment, not in an individual room.

| Column | Meaning |
|---|---|
| `OA_DMPR` / `OA_DMPR_DM` | Outside-air damper: actual position / commanded position (0-1) |
| `CHWC_VLV` / `CHWC_VLV_DM` | Chilled water coil valve: actual position / commanded position (0-1) |
| `SA_TEMPSPT` | Supply-air temperature setpoint (AHU-level, not a per-zone thermostat setpoint) |
| `ZONE_TEMP_1`..`5` | Zone air temperature (°F) |

This AHU has no heating coil, so it can't demonstrate a
simultaneous-heating-and-cooling fault - that fault type only exists in
the earlier synthetic mock data this replaced.

## Regenerating `frontend/src/data/lbnlZones.json`

```
python data/build_zones.py
```

This reads `data/raw/*.csv`, applies the same actual-vs-commanded
threshold logic a real `fault_detection.py` would run, and writes the
`ZoneDetail[]` JSON the frontend imports directly (see
`frontend/src/data/realZones.ts`). No backend or database involved yet -
this is still static data, per the current project stage.
