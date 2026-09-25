import React, { useRef } from 'react';
import {
  Upload,
  Play,
  Download,
  Terminal,
  Layers,
  Sliders,
  Table,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Radio,
  HardHat,
  ShieldAlert,
} from 'lucide-react';
import { AnalysisSummary, GroundSupportLevel } from '../types';

interface SidebarProps {
  seismicCount: number;
  faultsCount: number;
  seismicFilename: string | null;
  faultsFilename: string | null;
  hazardThreshold: number;
  onThresholdChange: (val: number) => void;
  onSeismicUpload: (file: File) => void;
  onFaultsUpload: (file: File) => void;
  onLoadSampleData: () => void;
  onRunAnalysis: () => void;
  onExportSurpac: () => void;
  onExport3Dec: () => void;
  onExportCsv: () => void;
  onOpenDataTable: () => void;
  onOpenReport: () => void;
  onOpenLiveSensors: () => void;
  consoleLogs: string[];
  isAnalyzing: boolean;
  hasRunAnalysis: boolean;
  summary: AnalysisSummary | null;
  supportLevel?: GroundSupportLevel;
  isStreaming?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  seismicCount,
  faultsCount,
  seismicFilename,
  faultsFilename,
  hazardThreshold,
  onThresholdChange,
  onSeismicUpload,
  onFaultsUpload,
  onLoadSampleData,
  onRunAnalysis,
  onExportSurpac,
  onExport3Dec,
  onExportCsv,
  onOpenDataTable,
  onOpenReport,
  onOpenLiveSensors,
  consoleLogs,
  isAnalyzing,
  hasRunAnalysis,
  summary,
  supportLevel,
  isStreaming,
}) => {
  const seismicInputRef = useRef<HTMLInputElement>(null);
  const faultsInputRef = useRef<HTMLInputElement>(null);

  const canRun = seismicCount > 0 && faultsCount > 0 && !isAnalyzing;

  return (
    <aside className="w-80 md:w-84 bg-[#121418] border-r border-[#242831] flex flex-col h-full overflow-hidden text-slate-200 font-sans shrink-0">
      {/* Scrollable Control Sections */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* Ground Support Status Card (Prompt Requirement 2) */}
        {supportLevel && (
          <div
            className={`border rounded-lg p-3 space-y-2 transition ${
              supportLevel.includes('Critical')
                ? 'bg-red-950/20 border-red-800/80 text-red-200'
                : supportLevel.includes('Heavy')
                ? 'bg-amber-950/20 border-amber-800/80 text-amber-200'
                : 'bg-[#181c24] border-[#2b313d] text-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider font-bold flex items-center gap-1.5">
                <HardHat className="w-3.5 h-3.5 text-cyan-400" />
                Ground Support Advisory
              </span>
              <button
                onClick={onOpenReport}
                className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                View Report →
              </button>
            </div>

            <div className="text-sm font-bold text-white flex items-center justify-between">
              <span>{supportLevel}</span>
              {summary && (
                <span className="text-xs font-mono font-normal text-slate-400">
                  {summary.highHazardCount} Alert Events
                </span>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {supportLevel.includes('Critical')
                ? 'High dynamic energy demand (≥45 kJ/m²). Yielding D-Bolts + 8m Twin Bulbed Cables + 100mm FRS required.'
                : supportLevel.includes('Heavy')
                ? 'Heavy dynamic energy demand (28 kJ/m²). Dynamic rockbolts + 6.5m Cables + 75mm FRS required.'
                : 'Standard to enhanced rebar and mesh support compliant with static and moderate load.'}
            </p>
          </div>
        )}

        {/* Live Sensor Ingestion Indicator (Prompt Requirement 3) */}
        <div className="bg-[#181c24] border border-[#2b313d] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              Dynamic Sensor Feed
            </span>
            <button
              onClick={onOpenLiveSensors}
              className="text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
            >
              Telemetry Console →
            </button>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
                }`}
              />
              <span className="text-slate-200 font-medium">
                {isStreaming ? 'Receiving Real-Time Geophone Signals' : 'Sensor Feed Idle'}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">8 Stations</span>
          </div>
        </div>

        {/* 1. Data Ingestion Card */}
        <div className="bg-[#181c24] border border-[#2b313d] rounded-lg p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              Data Ingestion
            </span>
            <button
              onClick={onLoadSampleData}
              title="Reset to synthetic mining dataset"
              className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 cursor-pointer"
            >
              Reset Demo Data
            </button>
          </div>

          {/* Microseismic Upload */}
          <div>
            <input
              ref={seismicInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onSeismicUpload(file);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => seismicInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-[#222732] hover:bg-[#2a303e] border border-[#343b4a] hover:border-cyan-500/70 text-white text-xs font-semibold py-2 px-3 rounded-md transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              Import Microseismic CSV
            </button>

            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              {seismicCount > 0 ? (
                <div className="flex items-center gap-1 text-emerald-400 truncate">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {seismicFilename || 'Events'}: {seismicCount.toLocaleString()} pts
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>No seismic data loaded</span>
                </div>
              )}
            </div>
          </div>

          {/* Faults Upload */}
          <div>
            <input
              ref={faultsInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFaultsUpload(file);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => faultsInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2 bg-[#222732] hover:bg-[#2a303e] border border-[#343b4a] hover:border-cyan-500/70 text-white text-xs font-semibold py-2 px-3 rounded-md transition cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              Import Fault Planes CSV
            </button>

            <div className="mt-1 flex items-center gap-1.5 text-[11px]">
              {faultsCount > 0 ? (
                <div className="flex items-center gap-1 text-emerald-400 truncate">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {faultsFilename || 'Faults'}: {faultsCount} structures
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-400">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>No fault data loaded</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Analysis Parameters Card */}
        <div className="bg-[#181c24] border border-[#2b313d] rounded-lg p-3 space-y-2">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Hazard Threshold
          </span>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Index Cutoff (Hi):</span>
            <span className="font-mono font-bold text-cyan-400 bg-[#101216] px-2 py-0.5 rounded border border-[#2d3139]">
              {hazardThreshold.toFixed(1)}
            </span>
          </div>

          <div className="space-y-1 pt-1">
            <input
              type="range"
              min="0.1"
              max="5.0"
              step="0.1"
              value={hazardThreshold}
              onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#2b313d] rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0.1 (Broad)</span>
              <span>2.5</span>
              <span>5.0 (Severe)</span>
            </div>
          </div>
        </div>

        {/* 3. Run & Export Card */}
        <div className="bg-[#181c24] border border-[#2b313d] rounded-lg p-3 space-y-2.5">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5 text-cyan-400" />
            Analysis & Exports
          </span>

          <button
            disabled={!canRun}
            onClick={onRunAnalysis}
            className={`w-full flex items-center justify-center gap-2 text-white text-xs font-bold py-2.5 px-3 rounded-md transition shadow cursor-pointer ${
              canRun
                ? 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 shadow-cyan-950/50'
                : 'bg-[#1b2029] text-slate-600 border border-[#262c37] cursor-not-allowed'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isAnalyzing ? 'Recalculating...' : 'Run Spatial Analysis'}
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              disabled={!hasRunAnalysis}
              onClick={onExportSurpac}
              className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-2 rounded-md transition cursor-pointer ${
                hasRunAnalysis
                  ? 'bg-emerald-800 hover:bg-emerald-700 text-white'
                  : 'bg-[#1a231d] text-emerald-900 cursor-not-allowed'
              }`}
            >
              <Download className="w-3 h-3" />
              Surpac (.str)
            </button>

            <button
              disabled={!hasRunAnalysis}
              onClick={onExport3Dec}
              className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-2 px-2 rounded-md transition cursor-pointer ${
                hasRunAnalysis
                  ? 'bg-emerald-800 hover:bg-emerald-700 text-white'
                  : 'bg-[#1a231d] text-emerald-900 cursor-not-allowed'
              }`}
            >
              <Download className="w-3 h-3" />
              3DEC (.txt)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={!hasRunAnalysis}
              onClick={onExportCsv}
              className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-2 rounded-md transition cursor-pointer ${
                hasRunAnalysis
                  ? 'bg-[#222732] hover:bg-[#2a303e] text-slate-200 border border-[#343b4a]'
                  : 'bg-[#181c24] text-slate-600 cursor-not-allowed border border-transparent'
              }`}
            >
              <FileSpreadsheet className="w-3 h-3 text-cyan-400" />
              Export CSV
            </button>

            <button
              disabled={!hasRunAnalysis}
              onClick={onOpenDataTable}
              className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-2 rounded-md transition cursor-pointer ${
                hasRunAnalysis
                  ? 'bg-[#222732] hover:bg-[#2a303e] text-slate-200 border border-[#343b4a]'
                  : 'bg-[#181c24] text-slate-600 cursor-not-allowed border border-transparent'
              }`}
            >
              <Table className="w-3 h-3 text-cyan-400" />
              Inspect Data
            </button>
          </div>
        </div>

        {/* Metrics Summary */}
        {summary && (
          <div className="bg-[#181c24] border border-[#2b313d] rounded-lg p-3 space-y-2 text-xs">
            <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-cyan-400 flex items-center justify-between">
              <span>Spatial Metrics</span>
              <span className="text-slate-400">{summary.executionTimeMs.toFixed(1)} ms</span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="bg-[#101216] p-2 rounded border border-[#252a34]">
                <span className="text-slate-400 text-[10px] block">Mean Distance</span>
                <span className="text-white font-semibold">{summary.meanDistance.toFixed(1)} m</span>
              </div>
              <div className="bg-[#101216] p-2 rounded border border-[#252a34]">
                <span className="text-slate-400 text-[10px] block">Peak Magnitude</span>
                <span className="text-amber-400 font-semibold">{summary.peakMagnitude.toFixed(2)} M</span>
              </div>
              <div className="col-span-2 bg-[#101216] p-2 rounded border border-red-950/60 flex items-center justify-between">
                <span className="text-slate-300 text-[10px]">
                  Alert Events (≥ {hazardThreshold.toFixed(1)}):
                </span>
                <span className="text-red-400 font-bold">
                  {summary.highHazardCount.toLocaleString()} ({((summary.highHazardCount / (summary.totalEvents || 1)) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Terminal / Status Console at Bottom */}
      <div className="h-44 border-t border-[#242831] bg-[#0d0f12] p-3 flex flex-col font-mono shrink-0">
        <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-slate-800 text-[10px]">
          <span className="font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-cyan-400" />
            Activity Log
          </span>
          <span className="text-emerald-400 flex items-center gap-1 text-[9px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Real-Time
          </span>
        </div>

        <div className="flex-1 overflow-y-auto text-[11px] text-slate-400 leading-relaxed whitespace-pre-wrap select-text pr-1">
          {consoleLogs.join('\n')}
        </div>
      </div>
    </aside>
  );
};
