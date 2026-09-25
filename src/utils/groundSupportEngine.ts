import {
  AnalyzedEvent,
  FaultPlane,
  AnalysisSummary,
  GroundSupportLevel,
  GroundSupportRecommendation,
  GeotechnicalReportData,
} from '../types';

export const GROUND_SUPPORT_TIERS: Record<GroundSupportLevel, GroundSupportRecommendation> = {
  'Standard Static': {
    level: 'Standard Static',
    hazardRange: 'Hi < 1.0',
    energyDemandKjM2: 5,
    primaryBolting: {
      type: 'Resin-Grouted Threaded Rebar (20mm, Grade 500)',
      lengthM: 2.4,
      spacingM: '1.2m x 1.2m staggered pattern',
      description: 'Stiff, high-adhesion static tendon support with 150 kN pull-out capacity.',
    },
    secondaryReinforcement: {
      type: 'Single Strand Cable Bolts (Intersections Only)',
      lengthM: 4.5,
      spacingM: '2.0m x 2.0m intersection array',
      description: 'Supplementary deep anchorage for spans exceeding 6.0 meters.',
    },
    surfaceSupport: {
      shotcreteThicknessMm: 0,
      meshType: 'Welded Wire Mesh (100mm x 100mm x 5.6mm)',
      description: 'Standard galvanized steel welded wire fabric pinned with volcano bearing plates.',
    },
    exclusionProtocol: {
      reEntryTimeHours: 0.5,
      exclusionRadiusM: 30,
      protocolSummary: 'Standard production re-entry after ventilation clearance.',
    },
  },
  'Enhanced Dynamic': {
    level: 'Enhanced Dynamic',
    hazardRange: '1.0 ≤ Hi < 2.5',
    energyDemandKjM2: 15,
    primaryBolting: {
      type: 'Modified High-Elongation Resin Bolts (Posimix / Durabar)',
      lengthM: 2.4,
      spacingM: '1.1m x 1.1m diamond pattern',
      description: 'Tough ductile tendons capable of absorbing moderate dilation and microseismic strain.',
    },
    secondaryReinforcement: {
      type: 'Single-Bulbed Cable Bolts',
      lengthM: 5.5,
      spacingM: '1.8m x 1.8m pattern in drive backs',
      description: 'Pre-tensioned grouted bulbed cables anchored beyond the plastic shear zone.',
    },
    surfaceSupport: {
      shotcreteThicknessMm: 50,
      meshType: 'Steel Fiber Reinforced Shotcrete (FRS) + 5.6mm Mesh',
      description: '50mm FRS (>500J ASTM C1550 toughness) integrated with pinned weldmesh.',
    },
    exclusionProtocol: {
      reEntryTimeHours: 2.0,
      exclusionRadiusM: 60,
      protocolSummary: 'Mandatory seismic decay monitoring; 2-hour exclusion following events ≥ M1.0.',
    },
  },
  'Heavy Dynamic': {
    level: 'Heavy Dynamic',
    hazardRange: '2.5 ≤ Hi < 4.0',
    energyDemandKjM2: 28,
    primaryBolting: {
      type: 'Yielding Dynamic Tendons (D-Bolt / Yield-Lok / Garford Dynamic)',
      lengthM: 2.4,
      spacingM: '1.0m x 1.0m square pattern',
      description: 'Energy-absorbing yielding anchors with >35 kJ dynamic capacity and 150mm elongation capacity.',
    },
    secondaryReinforcement: {
      type: 'Twin-Strand Bulbed Dynamic Cable Bolts',
      lengthM: 6.5,
      spacingM: '1.5m x 1.5m pattern with dynamic barrel plates',
      description: 'Heavy secondary reinforcement tied into the deep elastic rock mass core.',
    },
    surfaceSupport: {
      shotcreteThicknessMm: 75,
      meshType: 'High-Tensile Dynamic Chainlink Mesh + 75mm FRS',
      description: '75mm structural FRS overlaid with high-tensile diamond steel mesh (Geobrugg/Tecco).',
    },
    exclusionProtocol: {
      reEntryTimeHours: 6.0,
      exclusionRadiusM: 100,
      protocolSummary: 'Automated exclusion zone lockout; geophone array baseline stabilization required.',
    },
  },
  'Critical Rockburst Mitigation': {
    level: 'Critical Rockburst Mitigation',
    hazardRange: 'Hi ≥ 4.0',
    energyDemandKjM2: 45,
    primaryBolting: {
      type: 'Dual-Yielding Friction-Sleeve Rockbolts (22mm Dynamic D-Bolt)',
      lengthM: 3.0,
      spacingM: '0.9m x 0.9m staggered high-density pattern',
      description: 'Maximum energy-absorption yielding system designed for severe fault-slip and dynamic rock ejection.',
    },
    secondaryReinforcement: {
      type: 'Pre-Tensioned Modified Dynamic Twin Cable Bolts with Yield Absorbers',
      lengthM: 8.0,
      spacingM: '1.2m x 1.2m pattern across backs and hanging walls',
      description: 'Deep dynamic anchoring engineered to withstand shear displacements across active fault planes.',
    },
    surfaceSupport: {
      shotcreteThicknessMm: 100,
      meshType: '100mm FRS + Double-Layer High-Strength Dynamic Mesh with Straps',
      description: 'Reinforced dual-membrane containment capable of arresting rock ejection velocities > 3.0 m/s.',
    },
    exclusionProtocol: {
      reEntryTimeHours: 12.0,
      exclusionRadiusM: 150,
      protocolSummary: 'Full personnel withdrawal from sector; mandatory rock mechanics inspection prior to re-entry.',
    },
  },
};

/**
 * Determines the overall ground support tier based on the peak and 95th percentile hazard indices.
 */
export function determineGroundSupportTier(
  events: AnalyzedEvent[],
  threshold: number
): GroundSupportLevel {
  if (events.length === 0) return 'Standard Static';

  const highEvents = events.filter((e) => e.hazard_index >= threshold);
  const criticalEvents = events.filter((e) => e.hazard_index >= 4.0);

  if (criticalEvents.length >= 3 || (highEvents.length > 0 && highEvents.some((e) => e.hazard_index >= 4.5))) {
    return 'Critical Rockburst Mitigation';
  }
  if (highEvents.length >= 10 || events.some((e) => e.hazard_index >= 3.0)) {
    return 'Heavy Dynamic';
  }
  if (highEvents.length > 0 || events.some((e) => e.hazard_index >= 1.5)) {
    return 'Enhanced Dynamic';
  }
  return 'Standard Static';
}

/**
 * Generates an engineering-grade Geotechnical Ground Support & Hazard Assessment Report.
 */
export function generateGeotechnicalReport(
  events: AnalyzedEvent[],
  faults: FaultPlane[],
  summary: AnalysisSummary,
  options?: {
    mineSite?: string;
    depthM?: number;
    rockMassRatingRmr?: number;
    tunnelSpanM?: number;
  }
): GeotechnicalReportData {
  const mineSite = options?.mineSite || 'GeoShield Deep Mining Sector 04';
  const depthM = options?.depthM || 1850;
  const rockMassRatingRmr = options?.rockMassRatingRmr || 62;
  const tunnelSpanM = options?.tunnelSpanM || 5.2;

  const overallSupportLevel = determineGroundSupportTier(events, summary.threshold);

  // Group events by nearest fault plane to isolate structural drivers
  const faultMap = new Map<
    string,
    {
      count: number;
      highCount: number;
      maxMag: number;
      distances: number[];
    }
  >();

  for (const f of faults) {
    faultMap.set(f.fault_id, {
      count: 0,
      highCount: 0,
      maxMag: 0,
      distances: [],
    });
  }

  for (const ev of events) {
    const entry = faultMap.get(ev.nearest_fault_id);
    if (entry) {
      entry.count++;
      if (ev.hazard_index >= summary.threshold) entry.highCount++;
      if (ev.magnitude > entry.maxMag) entry.maxMag = ev.magnitude;
      entry.distances.push(ev.distance_to_fault);
    }
  }

  const activeFaultEvaluations = Array.from(faultMap.entries()).map(([faultId, stats]) => {
    const meanDist =
      stats.distances.length > 0
        ? stats.distances.reduce((a, b) => a + b, 0) / stats.distances.length
        : 0;

    let riskCategory: 'Low' | 'Moderate' | 'High' | 'Severe' = 'Low';
    if (stats.highCount > 25 || stats.maxMag >= 3.5) {
      riskCategory = 'Severe';
    } else if (stats.highCount > 8 || stats.maxMag >= 2.5) {
      riskCategory = 'High';
    } else if (stats.count > 20) {
      riskCategory = 'Moderate';
    }

    return {
      faultId,
      eventCount: stats.count,
      highHazardCount: stats.highCount,
      maxMagnitude: stats.maxMag,
      meanDistance: meanDist,
      riskCategory,
    };
  });

  // Sort by risk severity
  activeFaultEvaluations.sort((a, b) => b.highHazardCount - a.highHazardCount);

  return {
    reportId: `GSR-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    generatedAt: new Date().toISOString(),
    mineSite,
    depthM,
    rockMassRatingRmr,
    tunnelSpanM,
    summary,
    overallSupportLevel,
    recommendations: Object.values(GROUND_SUPPORT_TIERS),
    activeFaultEvaluations,
  };
}
