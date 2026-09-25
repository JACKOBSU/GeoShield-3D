import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  ShieldAlert,
  ShieldCheck,
  HardHat,
  Compass,
  Layers,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  FileType,
} from 'lucide-react';
import { GeotechnicalReportData, GroundSupportRecommendation } from '../types';
import { triggerDownload } from '../utils/exporter';
import { exportGeotechnicalReportToPdf } from '../utils/pdfGenerator';

interface GroundSupportReportProps {
  reportData: GeotechnicalReportData;
  onUpdateParameters?: (depthM: number, rmr: number, spanM: number) => void;
}

export const GroundSupportReport: React.FC<GroundSupportReportProps> = ({
  reportData,
  onUpdateParameters,
}) => {
  const [depth, setDepth] = useState(reportData.depthM);
  const [rmr, setRmr] = useState(reportData.rockMassRatingRmr);
  const [span, setSpan] = useState(reportData.tunnelSpanM);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const activeRec = reportData.recommendations.find(
    (r) => r.level === reportData.overallSupportLevel
  ) || reportData.recommendations[0];

  const handleExportPdf = () => {
    setIsExportingPdf(true);
    try {
      exportGeotechnicalReportToPdf(reportData, activeRec, depth, rmr, span);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    let md = `# Geotechnical Hazard Assessment & Ground Support Report\n`;
    md += `**Report ID**: ${reportData.reportId} | **Generated**: ${new Date(reportData.generatedAt).toLocaleString()}\n`;
    md += `**Mine Sector**: ${reportData.mineSite} | **Depth**: ${depth}m | **RMR**: ${rmr} | **Span**: ${span}m\n\n`;
    md += `## 1. Executive Summary\n`;
    md += `- **Assigned Support Level**: ${reportData.overallSupportLevel}\n`;
    md += `- **Calculated Dynamic Energy Demand**: ${activeRec.energyDemandKjM2} kJ/m²\n`;
    md += `- **Total Microseismic Events**: ${reportData.summary.totalEvents.toLocaleString()}\n`;
    md += `- **Peak Magnitude**: ${reportData.summary.peakMagnitude.toFixed(2)} M\n`;
    md += `- **High Hazard Events (≥${reportData.summary.threshold.toFixed(1)})**: ${reportData.summary.highHazardCount}\n\n`;
    md += `## 2. Ground Support Specifications\n`;
    md += `### Primary Tendon Reinforcement\n`;
    md += `- **Type**: ${activeRec.primaryBolting.type}\n`;
    md += `- **Length**: ${activeRec.primaryBolting.lengthM}m\n`;
    md += `- **Pattern**: ${activeRec.primaryBolting.spacingM}\n`;
    md += `- **Specification**: ${activeRec.primaryBolting.description}\n\n`;
    md += `### Secondary Deep Reinforcement\n`;
    md += `- **Type**: ${activeRec.secondaryReinforcement.type}\n`;
    md += `- **Length**: ${activeRec.secondaryReinforcement.lengthM}m\n`;
    md += `- **Pattern**: ${activeRec.secondaryReinforcement.spacingM}\n`;
    md += `- **Specification**: ${activeRec.secondaryReinforcement.description}\n\n`;
    md += `### Surface Containment & Lining\n`;
    md += `- **Shotcrete**: ${activeRec.surfaceSupport.shotcreteThicknessMm}mm FRS\n`;
    md += `- **Mesh**: ${activeRec.surfaceSupport.meshType}\n`;
    md += `- **Specification**: ${activeRec.surfaceSupport.description}\n\n`;
    md += `### Operational Safety Protocols\n`;
    md += `- **Exclusion Zone Radius**: ${activeRec.exclusionProtocol.exclusionRadiusM}m\n`;
    md += `- **Mandatory Re-entry Wait Time**: ${activeRec.exclusionProtocol.reEntryTimeHours} hours\n`;
    md += `- **Protocol**: ${activeRec.exclusionProtocol.protocolSummary}\n\n`;
    md += `## 3. Structural Fault Hazard Correlation\n`;
    md += `| Fault ID | Event Count | High Hazard Events | Peak Magnitude | Mean Distance | Risk Category |\n`;
    md += `|---|---|---|---|---|---|\n`;
    for (const f of reportData.activeFaultEvaluations) {
      md += `| ${f.faultId} | ${f.eventCount} | ${f.highHazardCount} | ${f.maxMagnitude.toFixed(2)} | ${f.meanDistance.toFixed(1)}m | ${f.riskCategory} |\n`;
    }

    triggerDownload(md, `Ground_Support_Report_${reportData.reportId}.md`, 'text/markdown');
  };

  const isSevere = reportData.overallSupportLevel.includes('Critical');
  const isHeavy = reportData.overallSupportLevel.includes('Heavy');

  return (
    <div className="h-full overflow-y-auto bg-[#0f1115] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Report Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2d3139]">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>{reportData.reportId}</span>
              <span>·</span>
              <span>ISO / ASTM Geotechnical Standard Compliant</span>
              <span>·</span>
              <span>{new Date(reportData.generatedAt).toLocaleDateString()}</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-1">
              Geotechnical Hazard & Ground Support Engineering Report
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportPdf}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-sky-500 hover:from-cyan-500 hover:to-sky-400 text-white rounded-md text-xs font-bold transition cursor-pointer shadow-sm shadow-cyan-900/50"
            >
              <FileType className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Export PDF Report'}</span>
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1e222a] hover:bg-[#282d38] border border-[#343b47] rounded-md text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Markdown</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#1e222a] hover:bg-[#282d38] border border-[#343b47] rounded-md text-xs font-semibold text-slate-300 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-400" />
              <span>Browser Print</span>
            </button>
          </div>
        </div>

        {/* Site & Excavation Parameters Customizer */}
        <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Underground Excavation Parameters</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Depth Below Surface (m)</label>
              <input
                type="number"
                value={depth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setDepth(val);
                  onUpdateParameters?.(val, rmr, span);
                }}
                className="w-full bg-[#101216] border border-[#2d3139] rounded px-3 py-1.5 font-mono text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Major principal stress σ₁ ≈ {(depth * 0.027).toFixed(1)} MPa</span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Rock Mass Rating (RMR)</label>
              <input
                type="number"
                min="10"
                max="95"
                value={rmr}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRmr(val);
                  onUpdateParameters?.(depth, val, span);
                }}
                className="w-full bg-[#101216] border border-[#2d3139] rounded px-3 py-1.5 font-mono text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                {rmr >= 65 ? 'Good Hard Rock (Class II)' : rmr >= 45 ? 'Fair Rock (Class III)' : 'Poor Rock (Class IV)'}
              </span>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Drive / Tunnel Span (m)</label>
              <input
                type="number"
                step="0.1"
                value={span}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setSpan(val);
                  onUpdateParameters?.(depth, rmr, val);
                }}
                className="w-full bg-[#101216] border border-[#2d3139] rounded px-3 py-1.5 font-mono text-white focus:outline-none focus:border-cyan-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">Equivalent dimension $D_e$</span>
            </div>
          </div>
        </div>

        {/* Executive Hazard Status Banner */}
        <div
          className={`rounded-lg p-5 border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            isSevere
              ? 'bg-red-950/30 border-red-800 text-red-200'
              : isHeavy
              ? 'bg-amber-950/30 border-amber-800 text-amber-200'
              : 'bg-cyan-950/30 border-cyan-800 text-cyan-200'
          }`}
        >
          <div className="flex items-start gap-3.5">
            <div
              className={`p-3 rounded-lg ${
                isSevere ? 'bg-red-900/50 text-red-400' : isHeavy ? 'bg-amber-900/50 text-amber-400' : 'bg-cyan-900/50 text-cyan-400'
              }`}
            >
              {isSevere ? <ShieldAlert className="w-8 h-8" /> : <HardHat className="w-8 h-8" />}
            </div>
            <div>
              <div className="text-xs uppercase font-mono tracking-wider font-semibold">
                Engineered Ground Support Advisory
              </div>
              <h2 className="text-xl font-bold text-white mt-0.5">
                {reportData.overallSupportLevel}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl">
                Dynamic energy dissipation requirement: <strong className="text-white font-mono">{activeRec.energyDemandKjM2} kJ/m²</strong>.
                Based on active fault shear proximity and localized seismic release.
              </p>
            </div>
          </div>

          <div className="bg-[#101216]/90 border border-white/10 p-3 rounded-md text-xs font-mono space-y-1 shrink-0">
            <div className="flex justify-between gap-4 text-slate-400">
              <span>Peak Hazard (Hi):</span>
              <span className="text-white font-bold">{reportData.summary.maxHazard.toFixed(3)}</span>
            </div>
            <div className="flex justify-between gap-4 text-slate-400">
              <span>Critical Events:</span>
              <span className="text-red-400 font-bold">{reportData.summary.criticalHazardCount}</span>
            </div>
            <div className="flex justify-between gap-4 text-slate-400">
              <span>Peak Magnitude:</span>
              <span className="text-amber-400 font-bold">{reportData.summary.peakMagnitude.toFixed(2)} M</span>
            </div>
          </div>
        </div>

        {/* Detailed Ground Support Specification Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Primary Rockbolts */}
          <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" />
              <span>1. Primary Reinforcement</span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">
                {activeRec.primaryBolting.type}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {activeRec.primaryBolting.description}
              </p>
            </div>
            <div className="pt-2 border-t border-[#2d3139] space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Tendon Length:</span>
                <span className="font-bold text-white">{activeRec.primaryBolting.lengthM} meters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Installation Pattern:</span>
                <span className="text-cyan-300">{activeRec.primaryBolting.spacingM}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Secondary Cable Bolts */}
          <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              <span>2. Secondary Cables</span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">
                {activeRec.secondaryReinforcement.type}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {activeRec.secondaryReinforcement.description}
              </p>
            </div>
            <div className="pt-2 border-t border-[#2d3139] space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Cable Length:</span>
                <span className="font-bold text-white">{activeRec.secondaryReinforcement.lengthM} meters</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Cable Spacing:</span>
                <span className="text-amber-300">{activeRec.secondaryReinforcement.spacingM}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Surface Containment */}
          <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <HardHat className="w-4 h-4" />
              <span>3. Surface Containment</span>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">
                {activeRec.surfaceSupport.meshType}
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {activeRec.surfaceSupport.description}
              </p>
            </div>
            <div className="pt-2 border-t border-[#2d3139] space-y-1.5 text-xs font-mono text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Shotcrete Thickness:</span>
                <span className="font-bold text-white">
                  {activeRec.surfaceSupport.shotcreteThicknessMm > 0
                    ? `${activeRec.surfaceSupport.shotcreteThicknessMm} mm FRS`
                    : 'Mesh Only'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Energy Absorption:</span>
                <span className="text-emerald-300">≥ {activeRec.energyDemandKjM2 * 20} Joules</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Safety & Re-Entry Protocol Card */}
        <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Operational Safety & Re-Entry Protocols</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono pt-2 border-t border-[#2d3139]">
            <div className="bg-[#101216] p-3 rounded border border-[#2d3139]">
              <span className="text-slate-400 block text-[11px]">Mandatory Re-entry Standdown</span>
              <span className="text-white font-bold text-base mt-1 block">
                {activeRec.exclusionProtocol.reEntryTimeHours} Hours
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Post-event seismic dissipation</span>
            </div>

            <div className="bg-[#101216] p-3 rounded border border-[#2d3139]">
              <span className="text-slate-400 block text-[11px]">Sector Exclusion Radius</span>
              <span className="text-white font-bold text-base mt-1 block">
                {activeRec.exclusionProtocol.exclusionRadiusM} Meters
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">From seismic source hypocenter</span>
            </div>

            <div className="bg-[#101216] p-3 rounded border border-[#2d3139]">
              <span className="text-slate-400 block text-[11px]">Clearance Prerequisite</span>
              <span className="text-emerald-400 font-semibold text-xs mt-1 block">
                Geophone Baseline Normal
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">&lt; 3 events/hr background rate</span>
            </div>
          </div>
        </div>

        {/* Structural Fault Hazard Correlation Table */}
        <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
              <Compass className="w-4 h-4 text-cyan-400" />
              <span>Fault Plane Hazard Correlation & Risk Ranking</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              {reportData.activeFaultEvaluations.length} Active Structures
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left border-collapse">
              <thead>
                <tr className="border-b border-[#2d3139] text-slate-400 text-[10px] uppercase">
                  <th className="py-2 px-3">Fault Structure</th>
                  <th className="py-2 px-3 text-right">Event Count</th>
                  <th className="py-2 px-3 text-right">High Hazard (Hi ≥ {reportData.summary.threshold.toFixed(1)})</th>
                  <th className="py-2 px-3 text-right">Max Magnitude</th>
                  <th className="py-2 px-3 text-right">Mean Distance</th>
                  <th className="py-2 px-3 text-center">Geotechnical Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#232730]">
                {reportData.activeFaultEvaluations.map((f) => (
                  <tr key={f.faultId} className="hover:bg-[#1e222a]/60">
                    <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                      {f.faultId}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{f.eventCount}</td>
                    <td className="py-2.5 px-3 text-right font-semibold">
                      <span className={f.highHazardCount > 0 ? 'text-red-400' : 'text-slate-400'}>
                        {f.highHazardCount}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-400">{f.maxMagnitude.toFixed(2)} M</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{f.meanDistance.toFixed(1)} m</td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          f.riskCategory === 'Severe'
                            ? 'bg-red-950 text-red-300 border border-red-800'
                            : f.riskCategory === 'High'
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : f.riskCategory === 'Moderate'
                            ? 'bg-yellow-950 text-yellow-300 border border-yellow-800'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {f.riskCategory}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
