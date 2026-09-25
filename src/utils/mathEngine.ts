import { SeismicEvent, FaultPlane, AnalyzedEvent, AnalysisSummary } from '../types';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Converts geological planar definitions (dip and dip-direction in degrees)
 * into 3D unit normal vectors.
 * Coordinates: X = East, Y = North, Z = Elevation (Up).
 */
export function dipDipDirToNormal(dipDeg: number, dipDirDeg: number): Vector3D {
  const dipRad = (dipDeg * Math.PI) / 180;
  const dipDirRad = (dipDirDeg * Math.PI) / 180;

  const nx = Math.sin(dipDirRad) * Math.sin(dipRad);
  const ny = Math.cos(dipDirRad) * Math.sin(dipRad);
  const nz = Math.cos(dipRad);

  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

/**
 * Resolves or normalizes the unit normal vector for a fault plane.
 */
export function getFaultNormal(fault: FaultPlane): Vector3D {
  if (
    fault.normalX !== undefined &&
    fault.normalY !== undefined &&
    fault.normalZ !== undefined
  ) {
    const len = Math.hypot(fault.normalX, fault.normalY, fault.normalZ) || 1;
    return {
      x: fault.normalX / len,
      y: fault.normalY / len,
      z: fault.normalZ / len,
    };
  }

  const dip = fault.dip ?? 45;
  const dipDir = fault.dip_direction ?? 0;
  return dipDipDirToNormal(dip, dipDir);
}

/**
 * Calculates the shortest Euclidean distance from a 3D point to a finite circular disk.
 * Vectorized formulation matching GeoShield-3D's NumPy engine.
 */
export function distancePointToDisk(
  px: number,
  py: number,
  pz: number,
  cx: number,
  cy: number,
  cz: number,
  nx: number,
  ny: number,
  nz: number,
  radius: number
): number {
  // 1. Vector from disk center to point
  const dx = px - cx;
  const dy = py - cy;
  const dz = pz - cz;

  // 2. Signed distance from point to plane containing disk
  const dPlane = dx * nx + dy * ny + dz * nz;

  // 3. Vector from disk center to projection on disk's plane
  // P_proj = P - dPlane * N
  // V_proj = P_proj - C = D - dPlane * N
  const vx = dx - dPlane * nx;
  const vy = dy - dPlane * ny;
  const vz = dz - dPlane * nz;

  const dCenter = Math.hypot(vx, vy, vz);

  // 4. Handle projection inside or outside the disk circle
  let qx: number;
  let qy: number;
  let qz: number;

  if (dCenter <= radius) {
    // Inside disk
    qx = cx + vx;
    qy = cy + vy;
    qz = cz + vz;
  } else {
    // Outside disk: clamp to boundary circle
    const factor = radius / (dCenter > 0 ? dCenter : 1);
    qx = cx + vx * factor;
    qy = cy + vy * factor;
    qz = cz + vz * factor;
  }

  // 5. Distance from point P to closest point Q
  return Math.hypot(px - qx, py - qy, pz - qz);
}

/**
 * High-performance spatial math engine that computes hazard indices
 * relative to geological fault structures.
 * Hazard Index Formula: H = Magnitude / (Distance_min + 1.0)
 */
export function calculateHazard(
  seismicEvents: SeismicEvent[],
  faults: FaultPlane[],
  threshold = 1.5
): { results: AnalyzedEvent[]; summary: AnalysisSummary } {
  const startTime = performance.now();

  // Pre-calculate normal vectors and cache fault parameters
  const faultCache = faults.map((f) => {
    const normal = getFaultNormal(f);
    return {
      fault_id: f.fault_id,
      cx: f.x,
      cy: f.y,
      cz: f.z,
      nx: normal.x,
      ny: normal.y,
      nz: normal.z,
      radius: f.radius,
    };
  });

  const numFaults = faultCache.length;
  const results: AnalyzedEvent[] = new Array(seismicEvents.length);

  let totalDist = 0;
  let minH = Number.POSITIVE_INFINITY;
  let maxH = Number.NEGATIVE_INFINITY;
  let highCount = 0;
  let critCount = 0;
  let peakMag = 0;
  const faultCounter = new Map<string, number>();

  for (let i = 0; i < seismicEvents.length; i++) {
    const event = seismicEvents[i];
    let minDistance = Number.POSITIVE_INFINITY;
    let nearestFaultId = faults[0]?.fault_id ?? 'None';

    if (numFaults > 0) {
      for (let j = 0; j < numFaults; j++) {
        const fc = faultCache[j];
        const dist = distancePointToDisk(
          event.x,
          event.y,
          event.z,
          fc.cx,
          fc.cy,
          fc.cz,
          fc.nx,
          fc.ny,
          fc.nz,
          fc.radius
        );

        if (dist < minDistance) {
          minDistance = dist;
          nearestFaultId = fc.fault_id;
        }
      }
    } else {
      minDistance = 0;
    }

    const hazardIndex = event.magnitude / (minDistance + 1.0);

    totalDist += minDistance;
    if (hazardIndex < minH) minH = hazardIndex;
    if (hazardIndex > maxH) maxH = hazardIndex;
    if (hazardIndex >= threshold) highCount++;
    if (hazardIndex >= 4.0) critCount++;
    if (event.magnitude > peakMag) peakMag = event.magnitude;

    faultCounter.set(nearestFaultId, (faultCounter.get(nearestFaultId) || 0) + 1);

    // Gutenberg-Richter radiated seismic energy estimation in Joules: log10(E) = 1.5M + 4.8
    const energyJoules = Math.pow(10, 1.5 * event.magnitude + 4.8);

    results[i] = {
      ...event,
      distance_to_fault: minDistance,
      nearest_fault_id: nearestFaultId,
      hazard_index: hazardIndex,
      energyJoules,
    };
  }

  // Find dominant fault with most events
  let dominantFaultId = 'None';
  let maxFaultCount = 0;
  for (const [fId, count] of faultCounter.entries()) {
    if (count > maxFaultCount) {
      maxFaultCount = count;
      dominantFaultId = fId;
    }
  }

  const executionTimeMs = performance.now() - startTime;
  const total = results.length;

  const summary: AnalysisSummary = {
    totalEvents: total,
    meanDistance: total > 0 ? totalDist / total : 0,
    minHazard: total > 0 ? minH : 0,
    maxHazard: total > 0 ? maxH : 0,
    highHazardCount: highCount,
    criticalHazardCount: critCount,
    threshold,
    executionTimeMs,
    peakMagnitude: peakMag,
    dominantFaultId,
  };

  return { results, summary };
}
