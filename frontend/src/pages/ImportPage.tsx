import Papa from 'papaparse';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { importZones } from '../api/facilityApi';
import { buildZonesFromSdahuRows, CsvImportError, type SdahuRow } from '../lib/sdahuImport';
import type { ZoneDetail } from '../types';

interface SampleFile {
  id: string;
  label: string;
  path: string;
}

const SAMPLE_FILES: SampleFile[] = [
  { id: 'sample-baseline', label: 'Normal operation (no fault)', path: '/samples/sdahu_baseline_jan1-3.csv' },
  { id: 'sample-damper', label: 'Damper stuck case', path: '/samples/sdahu_damper_stuck_075_jan1-3.csv' },
  { id: 'sample-coil', label: 'Coil valve leak case', path: '/samples/sdahu_coi_leakage_025_jan1-3.csv' },
];

type ImportState =
  | { status: 'idle' }
  | { status: 'working'; label: string }
  | { status: 'error'; message: string }
  | { status: 'done'; zones: ZoneDetail[] };

function parseCsv(csvText: string): Promise<SdahuRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<SdahuRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error: Error) => reject(error),
    });
  });
}

async function runImport(csvText: string, buildingId: string, buildingName: string): Promise<ZoneDetail[]> {
  const rows = await parseCsv(csvText);
  const zones = buildZonesFromSdahuRows(rows, { buildingId, buildingName });
  await importZones(zones);
  return zones;
}

export function ImportPage() {
  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const fileInputId = useId();

  async function handleSampleClick(sample: SampleFile) {
    setState({ status: 'working', label: sample.label });
    try {
      const response = await fetch(sample.path);
      if (!response.ok) throw new Error(`Could not load ${sample.path} (${response.status})`);
      const csvText = await response.text();
      const zones = await runImport(csvText, sample.id, sample.label);
      setState({ status: 'done', zones });
    } catch (error) {
      setState({ status: 'error', message: describeError(error) });
    }
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setState({ status: 'working', label: file.name });
    try {
      const csvText = await file.text();
      const buildingId = `import-${Date.now()}`;
      const buildingName = file.name.replace(/\.csv$/i, '');
      const zones = await runImport(csvText, buildingId, buildingName);
      setState({ status: 'done', zones });
    } catch (error) {
      setState({ status: 'error', message: describeError(error) });
    }
  }

  return (
    <div className="import-page">
      <h1>Import sensor data</h1>
      <p className="import-page__intro">
        Load a single-duct AHU CSV export (see <code>data/README.md</code> for the expected columns) and it runs
        through the same threshold rules as the built-in dataset, entirely in your browser. Nothing is uploaded
        anywhere and nothing persists past a page reload, there's no backend or database yet.
      </p>

      <section className="import-section">
        <h2>Try a sample file</h2>
        <div className="import-sample-list">
          {SAMPLE_FILES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSampleClick(sample)}
              disabled={state.status === 'working'}
            >
              {sample.label}
            </button>
          ))}
        </div>
      </section>

      <section className="import-section">
        <h2>Or upload your own</h2>
        <label htmlFor={fileInputId} className="import-file-label">
          Choose CSV file
        </label>
        <input
          id={fileInputId}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={state.status === 'working'}
        />
      </section>

      {state.status === 'working' && <p className="loading">Processing {state.label}...</p>}

      {state.status === 'error' && (
        <p className="import-error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'done' && (
        <section className="import-result">
          <h2>Imported {state.zones.length} zones</h2>
          <ul>
            {state.zones.map((zone) => (
              <li key={zone.id}>
                <Link to={`/zones/${zone.id}`}>{zone.buildingName} - {zone.name}</Link>
                {zone.faults.length > 0 ? ` - ${zone.faults[0].summary}` : ' - healthy'}
              </li>
            ))}
          </ul>
          <Link to="/" className="back-link">
            View on dashboard
          </Link>
        </section>
      )}
    </div>
  );
}

function describeError(error: unknown): string {
  if (error instanceof CsvImportError) return error.message;
  if (error instanceof Error) return `Could not import that file: ${error.message}`;
  return 'Could not import that file.';
}
