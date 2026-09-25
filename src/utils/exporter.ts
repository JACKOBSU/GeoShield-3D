import { AnalyzedEvent } from '../types';

export function exportSurpacString(events: AnalyzedEvent[], threshold: number): string {
  const highHazard = events.filter((e) => e.hazard_index >= threshold);
  if (highHazard.length === 0) return '';

  let out = 'GeoShield-3D High Hazard Export\n';
  out += '0, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000\n';

  for (const row of highHazard) {
    // String number 99, Y (North), X (East), Z (Elevation), Hazard Index
    out += `99 ${row.y.toFixed(3)} ${row.x.toFixed(3)} ${row.z.toFixed(3)} ${row.hazard_index.toFixed(4)}\n`;
  }

  out += '0, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000\n';
  return out;
}

export function export3DecCoordinates(events: AnalyzedEvent[], threshold: number): string {
  const highHazard = events.filter((e) => e.hazard_index >= threshold);
  if (highHazard.length === 0) return '';

  let out = '';
  for (const row of highHazard) {
    out += `${row.x.toFixed(3)} ${row.y.toFixed(3)} ${row.z.toFixed(3)} ${row.hazard_index.toFixed(4)}\n`;
  }
  return out;
}

export function exportAnalysisCsv(events: AnalyzedEvent[]): string {
  let out = 'id,timestamp,x,y,z,magnitude,distance_to_fault,nearest_fault_id,hazard_index\n';
  for (const r of events) {
    out += `${r.id},${r.timestamp ?? ''},${r.x.toFixed(2)},${r.y.toFixed(2)},${r.z.toFixed(2)},${r.magnitude.toFixed(2)},${r.distance_to_fault.toFixed(2)},${r.nearest_fault_id},${r.hazard_index.toFixed(4)}\n`;
  }
  return out;
}

export function triggerDownload(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
