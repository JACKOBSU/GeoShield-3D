export interface SeismicEvent {
  id: string | number;
  timestamp?: string;
  x: number;
  y: number;
  z: number;
  magnitude: number;
  source?: 'file' | 'live_sensor' | 'simulated_trigger';
}

export interface FaultPlane {
  fault_id: string;
  x: number;
  y: number;
  z: number;
  dip?: number;
  dip_direction?: number;
  radius: number;
  normalX?: number;
  normalY?: number;
  normalZ?: number;
}

export interface AnalyzedEvent extends SeismicEvent {
  distance_to_fault: number;
  nearest_fault_id: string;
  hazard_index: number;
  energyJoules?: number;
}

export interface AnalysisSummary {
  totalEvents: number;
  meanDistance: number;
  minHazard: number;
  maxHazard: number;
  highHazardCount: number;
  criticalHazardCount: number;
  threshold: number;
  executionTimeMs: number;
  peakMagnitude: number;
  dominantFaultId: string;
}

export interface GeophoneSensor {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  type: 'Triaxial Geophone' | 'Uniaxial Geophone' | 'High-Frequency Accelerometer';
  status: 'active' | 'degraded' | 'offline';
  sampleRateHz: number;
  lastTrigger?: string;
  signalToNoiseDb: number;
}

export type GroundSupportLevel = 'Standard Static' | 'Enhanced Dynamic' | 'Heavy Dynamic' | 'Critical Rockburst Mitigation';

export interface GroundSupportRecommendation {
  level: GroundSupportLevel;
  hazardRange: string;
  energyDemandKjM2: number;
  primaryBolting: {
    type: string;
    lengthM: number;
    spacingM: string;
    description: string;
  };
  secondaryReinforcement: {
    type: string;
    lengthM: number;
    spacingM: string;
    description: string;
  };
  surfaceSupport: {
    shotcreteThicknessMm: number;
    meshType: string;
    description: string;
  };
  exclusionProtocol: {
    reEntryTimeHours: number;
    exclusionRadiusM: number;
    protocolSummary: string;
  };
}

export interface GeotechnicalReportData {
  reportId: string;
  generatedAt: string;
  mineSite: string;
  depthM: number;
  rockMassRatingRmr: number;
  tunnelSpanM: number;
  summary: AnalysisSummary;
  overallSupportLevel: GroundSupportLevel;
  recommendations: GroundSupportRecommendation[];
  activeFaultEvaluations: Array<{
    faultId: string;
    eventCount: number;
    highHazardCount: number;
    maxMagnitude: number;
    meanDistance: number;
    riskCategory: 'Low' | 'Moderate' | 'High' | 'Severe';
  }>;
}
