import Papa from 'papaparse';
import { SeismicEvent, FaultPlane } from '../types';

export function normalizeHeader(header: string): string {
  const h = header.trim().toLowerCase().replace(/[\s_-]+/g, '');
  const map: Record<string, string> = {
    x: 'x',
    xcoord: 'x',
    easting: 'x',
    centerx: 'x',
    y: 'y',
    ycoord: 'y',
    northing: 'y',
    centery: 'y',
    z: 'z',
    zcoord: 'z',
    elevation: 'z',
    centerz: 'z',
    depth: 'z',
    mag: 'magnitude',
    magnitude: 'magnitude',
    time: 'timestamp',
    date: 'timestamp',
    timestamp: 'timestamp',
    datetime: 'timestamp',
    id: 'id',
    eventid: 'id',
    fault: 'fault_id',
    faultid: 'fault_id',
    dip: 'dip',
    dipdeg: 'dip',
    dipdirection: 'dip_direction',
    dipdir: 'dip_direction',
    azimuth: 'dip_direction',
    radius: 'radius',
    rad: 'radius',
    normalx: 'normalx',
    normaly: 'normaly',
    normalz: 'normalz',
    nx: 'normalx',
    ny: 'normaly',
    nz: 'normalz',
  };
  return map[h] || h;
}

export function parseSeismicCsv(csvString: string): SeismicEvent[] {
  const result = Papa.parse<Record<string, any>>(csvString, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`Failed to parse seismic CSV: ${result.errors[0]?.message}`);
  }

  const events: SeismicEvent[] = [];

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const x = Number(row.x);
    const y = Number(row.y);
    const z = Number(row.z);
    const mag = row.magnitude !== undefined ? Number(row.magnitude) : 1.0;

    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z)) {
      events.push({
        id: row.id !== undefined ? String(row.id) : `EV-${i + 1}`,
        timestamp: row.timestamp ? String(row.timestamp) : undefined,
        x,
        y,
        z,
        magnitude: Number.isFinite(mag) ? Math.max(0.1, mag) : 1.0,
      });
    }
  }

  if (events.length === 0) {
    throw new Error('No valid seismic records found. Expected columns: X, Y, Z, Magnitude.');
  }

  return events;
}

export function parseFaultsCsv(csvString: string): FaultPlane[] {
  const result = Papa.parse<Record<string, any>>(csvString, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  });

  if (result.errors.length > 0 && result.data.length === 0) {
    throw new Error(`Failed to parse fault CSV: ${result.errors[0]?.message}`);
  }

  const faults: FaultPlane[] = [];

  for (let i = 0; i < result.data.length; i++) {
    const row = result.data[i];
    const x = Number(row.x);
    const y = Number(row.y);
    const z = Number(row.z);
    const radius = Number(row.radius);

    if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(z) && Number.isFinite(radius) && radius > 0) {
      const faultId = row.fault_id !== undefined ? String(row.fault_id) : `Fault-${i + 1}`;

      const fault: FaultPlane = {
        fault_id: faultId,
        x,
        y,
        z,
        radius,
      };

      if (row.normalx !== undefined && row.normaly !== undefined && row.normalz !== undefined) {
        fault.normalX = Number(row.normalx);
        fault.normalY = Number(row.normaly);
        fault.normalZ = Number(row.normalz);
      } else {
        fault.dip = row.dip !== undefined ? Number(row.dip) : 45;
        fault.dip_direction = row.dip_direction !== undefined ? Number(row.dip_direction) : 0;
      }

      faults.push(fault);
    }
  }

  if (faults.length === 0) {
    throw new Error('No valid fault plane records found. Expected columns: X, Y, Z, Radius, (Dip/Dip_Direction or NormalX/NormalY/NormalZ).');
  }

  return faults;
}
