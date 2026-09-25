import { GeophoneSensor, SeismicEvent, FaultPlane } from '../types';

export const DEFAULT_GEOPHONE_ARRAY: GeophoneSensor[] = [
  {
    id: 'GEO-01',
    name: 'Stope 1800 Hanging Wall',
    x: 1800,
    y: 5800,
    z: -1400,
    type: 'Triaxial Geophone',
    status: 'active',
    sampleRateHz: 6000,
    signalToNoiseDb: 42.5,
  },
  {
    id: 'GEO-02',
    name: 'Fault F-1 Footwall Access',
    x: 2300,
    y: 6300,
    z: -1600,
    type: 'Triaxial Geophone',
    status: 'active',
    sampleRateHz: 6000,
    signalToNoiseDb: 38.2,
  },
  {
    id: 'GEO-03',
    name: 'Shaft 2 Pillar Array',
    x: 3400,
    y: 7200,
    z: -1900,
    type: 'High-Frequency Accelerometer',
    status: 'active',
    sampleRateHz: 12000,
    signalToNoiseDb: 46.1,
  },
  {
    id: 'GEO-04',
    name: 'Sector 4 Extraction Horizon',
    x: 4200,
    y: 6800,
    z: -1100,
    type: 'Triaxial Geophone',
    status: 'active',
    sampleRateHz: 6000,
    signalToNoiseDb: 35.8,
  },
  {
    id: 'GEO-05',
    name: 'Deep Decline Intertie',
    x: 2700,
    y: 7800,
    z: -2400,
    type: 'Triaxial Geophone',
    status: 'active',
    sampleRateHz: 6000,
    signalToNoiseDb: 44.0,
  },
  {
    id: 'GEO-06',
    name: 'Fault F-5 Abutment Monitor',
    x: 3100,
    y: 6900,
    z: -1300,
    type: 'High-Frequency Accelerometer',
    status: 'active',
    sampleRateHz: 12000,
    signalToNoiseDb: 48.7,
  },
  {
    id: 'GEO-07',
    name: 'Crown Pillar Level 12',
    x: 1600,
    y: 7200,
    z: -850,
    type: 'Uniaxial Geophone',
    status: 'active',
    sampleRateHz: 4000,
    signalToNoiseDb: 31.4,
  },
  {
    id: 'GEO-08',
    name: 'South Boundary Vent Raise',
    x: 4600,
    y: 6100,
    z: -1300,
    type: 'Triaxial Geophone',
    status: 'active',
    sampleRateHz: 6000,
    signalToNoiseDb: 39.5,
  },
];

/**
 * Generates a realistic microseismic event located near fault planes or active stopes.
 */
export function generateLiveSeismicEvent(
  faults: FaultPlane[],
  sequenceIndex: number,
  forcedFaultId?: string,
  forcedMagnitude?: number
): SeismicEvent {
  // Select target fault
  const targetFault =
    (forcedFaultId && faults.find((f) => f.fault_id === forcedFaultId)) ||
    faults[Math.floor(Math.random() * faults.length)] || {
      fault_id: 'F-1',
      x: 3000,
      y: 7000,
      z: -1500,
      radius: 600,
    };

  // Distance from fault center (clustered along the disk plane)
  const angle = Math.random() * Math.PI * 2;
  const radiusOffset = Math.random() * targetFault.radius * 0.85;

  const dx = Math.cos(angle) * radiusOffset;
  const dy = Math.sin(angle) * radiusOffset;
  // Gaussian-like off-plane jitter
  const dz = (Math.random() - 0.5) * 60;

  const x = Math.round((targetFault.x + dx) * 10) / 10;
  const y = Math.round((targetFault.y + dy) * 10) / 10;
  const z = Math.round((targetFault.z + dz) * 10) / 10;

  // Realistic Gutenberg-Richter magnitude distribution:
  // Many small events (M 0.5 - 1.8), rare moderate events (M 2.0 - 3.5)
  let magnitude: number;
  if (forcedMagnitude !== undefined) {
    magnitude = forcedMagnitude;
  } else {
    const r = Math.random();
    if (r > 0.95) {
      magnitude = 2.4 + Math.random() * 1.4; // High hazard burst
    } else if (r > 0.75) {
      magnitude = 1.4 + Math.random() * 0.9;
    } else {
      magnitude = 0.5 + Math.random() * 0.8;
    }
  }

  return {
    id: `LIVE-${Date.now().toString().slice(-6)}-${sequenceIndex}`,
    timestamp: new Date().toISOString(),
    x,
    y,
    z,
    magnitude: Math.round(magnitude * 100) / 100,
    source: 'live_sensor',
  };
}
