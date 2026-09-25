import { FaultPlane, SeismicEvent } from '../types';

export const SAMPLE_FAULTS: FaultPlane[] = [
  {
    fault_id: 'F-1',
    x: 2000,
    y: 6000,
    z: -1500,
    radius: 600,
    normalX: 0.707,
    normalY: 0.707,
    normalZ: 0.0,
  },
  {
    fault_id: 'F-2',
    x: 3500,
    y: 7500,
    z: -2000,
    radius: 800,
    normalX: 1.0,
    normalY: 0.0,
    normalZ: 0.0,
  },
  {
    fault_id: 'F-3',
    x: 4500,
    y: 6500,
    z: -1000,
    radius: 500,
    normalX: 0.0,
    normalY: 1.0,
    normalZ: 0.0,
  },
  {
    fault_id: 'F-4',
    x: 2500,
    y: 8000,
    z: -2500,
    radius: 700,
    normalX: -0.5,
    normalY: 0.866,
    normalZ: 0.1,
  },
  {
    fault_id: 'F-5',
    x: 3000,
    y: 7000,
    z: -1200,
    radius: 900,
    normalX: 0.3,
    normalY: 0.2,
    normalZ: 0.93,
  },
];

/**
 * Generates realistic synthetic microseismic event dataset matching
 * mining engineering distributions (80% clustered around active fault planes,
 * 20% background regional stress).
 */
export function generateSampleSeismic(count = 1500): SeismicEvent[] {
  const events: SeismicEvent[] = [];
  const baseTime = Date.now() - 14 * 86400000;

  // Simple pseudo-random with fixed seed for consistency
  let seed = 42;
  function rnd() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }
  function rndRange(min: number, max: number) {
    return min + rnd() * (max - min);
  }
  function rndNormal(mean: number, std: number) {
    const u1 = Math.max(1e-6, rnd());
    const u2 = rnd();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * std;
  }

  const clusterCount = Math.floor(count * 0.85);
  const bgCount = count - clusterCount;

  // 1. Clustered near fault structures
  const eventsPerFault = Math.floor(clusterCount / SAMPLE_FAULTS.length);

  for (const fault of SAMPLE_FAULTS) {
    for (let i = 0; i < eventsPerFault; i++) {
      const r = rndRange(0, fault.radius * 0.9);
      const theta = rndRange(0, Math.PI * 2);

      // In-plane displacement
      const dx = r * Math.cos(theta);
      const dy = r * Math.sin(theta);
      // Small off-plane jitter
      const dz = rndNormal(0, 45);

      const x = fault.x + dx;
      const y = fault.y + dy;
      const z = fault.z + dz;

      // Distance proxy to fault center for higher magnitude likelihood
      const mag = Math.min(4.8, Math.max(0.6, rndNormal(2.4, 0.75)));
      const timeOffset = Math.floor(rndRange(0, 14 * 86400000));
      const timestamp = new Date(baseTime + timeOffset).toISOString();

      events.push({
        id: `EV-${events.length + 1}`,
        timestamp,
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        z: Math.round(z * 10) / 10,
        magnitude: Math.round(mag * 100) / 100,
      });
    }
  }

  // 2. Background regional events
  for (let i = 0; i < bgCount; i++) {
    const x = rndRange(1200, 4800);
    const y = rndRange(5200, 8800);
    const z = rndRange(-2800, -700);
    const mag = Math.min(3.8, Math.max(0.4, rndNormal(1.6, 0.6)));
    const timeOffset = Math.floor(rndRange(0, 14 * 86400000));
    const timestamp = new Date(baseTime + timeOffset).toISOString();

    events.push({
      id: `EV-${events.length + 1}`,
      timestamp,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      z: Math.round(z * 10) / 10,
      magnitude: Math.round(mag * 100) / 100,
    });
  }

  return events;
}
