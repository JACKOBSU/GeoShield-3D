import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigation, ActiveTab } from './components/Navigation';
import { Sidebar } from './components/Sidebar';
import { Viewport3D } from './components/Viewport3D';
import { GroundSupportReport } from './components/GroundSupportReport';
import { LiveSensorPanel } from './components/LiveSensorPanel';
import { DataTableModal } from './components/DataTableModal';
import {
  SeismicEvent,
  FaultPlane,
  AnalyzedEvent,
  AnalysisSummary,
  GeophoneSensor,
  GeotechnicalReportData,
} from './types';
import { calculateHazard } from './utils/mathEngine';
import { parseSeismicCsv, parseFaultsCsv } from './utils/parser';
import {
  exportSurpacString,
  export3DecCoordinates,
  exportAnalysisCsv,
  triggerDownload,
} from './utils/exporter';
import { SAMPLE_FAULTS, generateSampleSeismic } from './utils/sampleData';
import {
  generateGeotechnicalReport,
  determineGroundSupportTier,
} from './utils/groundSupportEngine';
import {
  DEFAULT_GEOPHONE_ARRAY,
  generateLiveSeismicEvent,
} from './utils/sensorSimulator';

export const App: React.FC = () => {
  // Navigation & View state
  const [activeTab, setActiveTab] = useState<ActiveTab>('viewport');

  // Datasets State
  const [seismicEvents, setSeismicEvents] = useState<SeismicEvent[]>([]);
  const [faults, setFaults] = useState<FaultPlane[]>([]);
  const [analyzedEvents, setAnalyzedEvents] = useState<AnalyzedEvent[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary | null>(null);

  // File metadata
  const [seismicFilename, setSeismicFilename] = useState<string | null>(null);
  const [faultsFilename, setFaultsFilename] = useState<string | null>(null);

  // Parameters State
  const [hazardThreshold, setHazardThreshold] = useState<number>(1.5);
  const [selectedEvent, setSelectedEvent] = useState<AnalyzedEvent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [hasRunAnalysis, setHasRunAnalysis] = useState<boolean>(false);

  // Geotechnical Report Customization State
  const [reportDepth, setReportDepth] = useState<number>(1850);
  const [reportRmr, setReportRmr] = useState<number>(62);
  const [reportSpan, setReportSpan] = useState<number>(5.2);

  // Live Geophone Sensors State
  const [sensors, setSensors] = useState<GeophoneSensor[]>(DEFAULT_GEOPHONE_ARRAY);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamSpeed, setStreamSpeed] = useState<number>(1);
  const [liveStreamEvents, setLiveStreamEvents] = useState<AnalyzedEvent[]>([]);
  const liveSequenceRef = useRef<number>(1);

  // Console Log State
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'GeoShield-3D // Geological Microseismic Hazard & Dynamic Ground Support Engine initialized.',
    'Geophone sensor array calibrated: 8 underground triaxial monitoring stations active.',
  ]);

  const addLog = useCallback((message: string) => {
    const time = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [`[${time}] ${message}`, ...prev.slice(0, 150)]);
  }, []);

  // Compute hazard analysis
  const executeAnalysis = useCallback(
    (events: SeismicEvent[], faultPlanes: FaultPlane[], thresh: number) => {
      if (events.length === 0 || faultPlanes.length === 0) return;

      setIsAnalyzing(true);
      addLog(`Running vectorized spatial calculations across ${events.length.toLocaleString()} points and ${faultPlanes.length} faults...`);

      setTimeout(() => {
        try {
          const { results, summary: resSummary } = calculateHazard(events, faultPlanes, thresh);
          setAnalyzedEvents(results);
          setSummary(resSummary);
          setHasRunAnalysis(true);

          const supportTier = determineGroundSupportTier(results, thresh);

          addLog(
            `Analysis Complete in ${resSummary.executionTimeMs.toFixed(1)}ms!\n` +
              `Total events analyzed: ${resSummary.totalEvents.toLocaleString()}\n` +
              `Mean distance to fault: ${resSummary.meanDistance.toFixed(2)} m\n` +
              `Peak Magnitude: ${resSummary.peakMagnitude.toFixed(2)} M\n` +
              `High Hazard Events (≥${thresh.toFixed(1)}): ${resSummary.highHazardCount.toLocaleString()}\n` +
              `Advisory Support Level: ${supportTier}`
          );
        } catch (err: any) {
          addLog(`Error during calculation: ${err?.message || String(err)}`);
        } finally {
          setIsAnalyzing(false);
        }
      }, 30);
    },
    [addLog]
  );

  // Initial load of synthetic mining dataset
  const handleLoadSampleData = useCallback(() => {
    addLog('Loading benchmark mining model (5 Faults, 1,500 Microseismic Events)...');
    const demoFaults = SAMPLE_FAULTS;
    const demoEvents = generateSampleSeismic(1500);

    setFaults(demoFaults);
    setFaultsFilename('sample_faults.csv');
    setSeismicEvents(demoEvents);
    setSeismicFilename('sample_seismic.csv');

    executeAnalysis(demoEvents, demoFaults, hazardThreshold);
  }, [addLog, executeAnalysis, hazardThreshold]);

  useEffect(() => {
    handleLoadSampleData();
  }, []);

  // Live Geophone Streaming Engine (Prompt Requirement 3)
  useEffect(() => {
    if (!isStreaming) return;

    // Calculate interval based on stream speed: e.g. 1x = 1800ms, 2x = 900ms, 5x = 360ms
    const intervalMs = Math.max(300, Math.floor(1800 / streamSpeed));

    const timer = setInterval(() => {
      if (faults.length === 0) return;

      const newRawEvent = generateLiveSeismicEvent(faults, liveSequenceRef.current++);
      const { results: analyzedList } = calculateHazard([newRawEvent], faults, hazardThreshold);
      const newAnalyzedEvent = analyzedList[0];

      setLiveStreamEvents((prev) => [newAnalyzedEvent, ...prev.slice(0, 500)]);

      // Append to the overall events dataset and update summary
      setAnalyzedEvents((prev) => {
        const updated = [newAnalyzedEvent, ...prev];
        return updated.length > 5000 ? updated.slice(0, 5000) : updated;
      });

      setSeismicEvents((prev) => {
        const updated = [newRawEvent, ...prev];
        return updated.length > 5000 ? updated.slice(0, 5000) : updated;
      });

      if (newAnalyzedEvent.hazard_index >= hazardThreshold) {
        addLog(
          `ALERT: Live Geophone Trigger ${newAnalyzedEvent.id} | Mag ${newAnalyzedEvent.magnitude.toFixed(2)}M near ${newAnalyzedEvent.nearest_fault_id} | Hi=${newAnalyzedEvent.hazard_index.toFixed(3)}`
        );
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isStreaming, streamSpeed, faults, hazardThreshold, addLog]);

  // Manual Trigger: Simulated Blast or Fault Slip
  const handleTriggerLiveEvent = (forcedFaultId?: string, forcedMagnitude?: number) => {
    if (faults.length === 0) return;
    const raw = generateLiveSeismicEvent(faults, liveSequenceRef.current++, forcedFaultId, forcedMagnitude);
    const { results } = calculateHazard([raw], faults, hazardThreshold);
    const analyzed = results[0];

    setLiveStreamEvents((prev) => [analyzed, ...prev]);
    setAnalyzedEvents((prev) => [analyzed, ...prev]);
    setSeismicEvents((prev) => [raw, ...prev]);

    addLog(
      `Triggered Dynamic Event: ${analyzed.id} (M${analyzed.magnitude.toFixed(2)}) near Fault ${analyzed.nearest_fault_id} (Dist: ${analyzed.distance_to_fault.toFixed(1)}m, Hi=${analyzed.hazard_index.toFixed(3)})`
    );
  };

  const handleTriggerBlast = () => {
    if (faults.length === 0) return;
    addLog('Stope Production Blast initiated: Ingesting 15 microseismic relaxation triggers...');
    const newRaws: SeismicEvent[] = [];
    for (let i = 0; i < 15; i++) {
      newRaws.push(generateLiveSeismicEvent(faults, liveSequenceRef.current++));
    }
    const { results } = calculateHazard(newRaws, faults, hazardThreshold);
    setLiveStreamEvents((prev) => [...results, ...prev]);
    setAnalyzedEvents((prev) => [...results, ...prev]);
    setSeismicEvents((prev) => [...newRaws, ...prev]);
  };

  const handleClearLiveStream = () => {
    setLiveStreamEvents([]);
    addLog('Cleared dynamic streaming event buffer.');
  };

  // Upload handlers
  const handleSeismicUpload = (file: File) => {
    addLog(`Reading microseismic CSV: ${file.name}...`);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseSeismicCsv(text);
        setSeismicEvents(parsed);
        setSeismicFilename(file.name);
        addLog(
          `Microseismic Log loaded: ${parsed.length.toLocaleString()} events detected.`
        );

        if (faults.length > 0) {
          executeAnalysis(parsed, faults, hazardThreshold);
        }
      } catch (err: any) {
        addLog(`Failed to parse seismic CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleFaultsUpload = (file: File) => {
    addLog(`Reading geological fault CSV: ${file.name}...`);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseFaultsCsv(text);
        setFaults(parsed);
        setFaultsFilename(file.name);
        addLog(
          `Fault Log loaded: ${parsed.length} geological structures parsed.`
        );

        if (seismicEvents.length > 0) {
          executeAnalysis(seismicEvents, parsed, hazardThreshold);
        }
      } catch (err: any) {
        addLog(`Failed to parse fault CSV: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const handleThresholdChange = (val: number) => {
    setHazardThreshold(val);
    if (analyzedEvents.length > 0) {
      const highCount = analyzedEvents.filter((e) => e.hazard_index >= val).length;
      if (summary) {
        setSummary({
          ...summary,
          threshold: val,
          highHazardCount: highCount,
        });
      }
      addLog(`Hazard threshold updated to ${val.toFixed(1)}. High Hazard Events: ${highCount.toLocaleString()}`);
    }
  };

  // Export handlers
  const handleExportSurpac = () => {
    if (analyzedEvents.length === 0) return;
    const content = exportSurpacString(analyzedEvents, hazardThreshold);
    if (!content) {
      addLog(`No events found with Hazard Index >= ${hazardThreshold.toFixed(1)}. Nothing to export.`);
      return;
    }
    const count = analyzedEvents.filter((e) => e.hazard_index >= hazardThreshold).length;
    triggerDownload(content, 'geoshield_high_hazard.str', 'text/plain');
    addLog(`Export Completed!\nFile: geoshield_high_hazard.str\nPoints: ${count}`);
  };

  const handleExport3Dec = () => {
    if (analyzedEvents.length === 0) return;
    const content = export3DecCoordinates(analyzedEvents, hazardThreshold);
    if (!content) {
      addLog(`No events found with Hazard Index >= ${hazardThreshold.toFixed(1)}. Nothing to export.`);
      return;
    }
    const count = analyzedEvents.filter((e) => e.hazard_index >= hazardThreshold).length;
    triggerDownload(content, 'geoshield_hazard_blocks.txt', 'text/plain');
    addLog(`Export Completed!\nFile: geoshield_hazard_blocks.txt\nPoints: ${count}`);
  };

  const handleExportCsv = () => {
    if (analyzedEvents.length === 0) return;
    const content = exportAnalysisCsv(analyzedEvents);
    triggerDownload(content, 'geoshield_analysis_results.csv', 'text/csv');
    addLog(`Export Completed!\nFile: geoshield_analysis_results.csv\nTotal records: ${analyzedEvents.length}`);
  };

  // Generate Report Data (Prompt Requirement 2)
  const reportData: GeotechnicalReportData = summary
    ? generateGeotechnicalReport(analyzedEvents, faults, summary, {
        mineSite: 'GeoShield Deep Hard-Rock Sector 04',
        depthM: reportDepth,
        rockMassRatingRmr: reportRmr,
        tunnelSpanM: reportSpan,
      })
    : {
        reportId: 'GSR-INITIAL',
        generatedAt: new Date().toISOString(),
        mineSite: 'GeoShield Deep Hard-Rock Sector 04',
        depthM: reportDepth,
        rockMassRatingRmr: reportRmr,
        tunnelSpanM: reportSpan,
        summary: {
          totalEvents: 0,
          meanDistance: 0,
          minHazard: 0,
          maxHazard: 0,
          highHazardCount: 0,
          criticalHazardCount: 0,
          threshold: hazardThreshold,
          executionTimeMs: 0,
          peakMagnitude: 0,
          dominantFaultId: 'None',
        },
        overallSupportLevel: 'Standard Static',
        recommendations: [],
        activeFaultEvaluations: [],
      };

  const supportLevel = reportData.overallSupportLevel;

  return (
    <div className="flex flex-col w-screen h-screen bg-[#0e1014] text-slate-100 overflow-hidden select-none">
      {/* Top Modern One-Row Three-Zone Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isStreaming={isStreaming}
        toggleStreaming={() => {
          const next = !isStreaming;
          setIsStreaming(next);
          addLog(next ? 'Live geophone streaming connection established.' : 'Live geophone streaming paused.');
        }}
        supportLevel={supportLevel}
        onQuickRunAnalysis={() => executeAnalysis(seismicEvents, faults, hazardThreshold)}
        isAnalyzing={isAnalyzing}
        canRun={seismicEvents.length > 0 && faults.length > 0 && !isAnalyzing}
      />

      {/* Main Body Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Control Sidebar */}
        <Sidebar
          seismicCount={seismicEvents.length}
          faultsCount={faults.length}
          seismicFilename={seismicFilename}
          faultsFilename={faultsFilename}
          hazardThreshold={hazardThreshold}
          onThresholdChange={handleThresholdChange}
          onSeismicUpload={handleSeismicUpload}
          onFaultsUpload={handleFaultsUpload}
          onLoadSampleData={handleLoadSampleData}
          onRunAnalysis={() => executeAnalysis(seismicEvents, faults, hazardThreshold)}
          onExportSurpac={handleExportSurpac}
          onExport3Dec={handleExport3Dec}
          onExportCsv={handleExportCsv}
          onOpenDataTable={() => setIsModalOpen(true)}
          onOpenReport={() => setActiveTab('report')}
          onOpenLiveSensors={() => setActiveTab('live_sensors')}
          consoleLogs={consoleLogs}
          isAnalyzing={isAnalyzing}
          hasRunAnalysis={hasRunAnalysis}
          summary={summary}
          supportLevel={supportLevel}
          isStreaming={isStreaming}
        />

        {/* Central View Switcher */}
        <main className="flex-1 h-full relative overflow-hidden bg-[#0e1014]">
          {activeTab === 'viewport' && (
            <Viewport3D
              faults={faults}
              analyzedEvents={analyzedEvents}
              hazardThreshold={hazardThreshold}
              selectedEvent={selectedEvent}
              onSelectEvent={(ev) => {
                setSelectedEvent(ev);
                if (ev) {
                  addLog(
                    `Inspecting event ${ev.id}: H=${ev.hazard_index.toFixed(3)}, Fault=${ev.nearest_fault_id} (${ev.distance_to_fault.toFixed(1)}m), Mag=${ev.magnitude.toFixed(2)}M`
                  );
                }
              }}
              sensors={sensors}
              onOpenReport={() => setActiveTab('report')}
              isStreaming={isStreaming}
            />
          )}

          {activeTab === 'report' && (
            <GroundSupportReport
              reportData={reportData}
              onUpdateParameters={(d, r, s) => {
                setReportDepth(d);
                setReportRmr(r);
                setReportSpan(s);
                addLog(`Excavation parameters updated: Depth=${d}m, RMR=${r}, Span=${s}m.`);
              }}
            />
          )}

          {activeTab === 'live_sensors' && (
            <LiveSensorPanel
              sensors={sensors}
              isStreaming={isStreaming}
              onToggleStreaming={() => {
                const next = !isStreaming;
                setIsStreaming(next);
                addLog(next ? 'Live geophone streaming connection established.' : 'Live geophone streaming paused.');
              }}
              streamSpeed={streamSpeed}
              onSetStreamSpeed={(s) => {
                setStreamSpeed(s);
                addLog(`Stream speed adjusted to ${s}x.`);
              }}
              liveEvents={liveStreamEvents}
              onTriggerEvent={handleTriggerLiveEvent}
              onTriggerBlast={handleTriggerBlast}
              onClearLiveStream={handleClearLiveStream}
              hazardThreshold={hazardThreshold}
            />
          )}

          {activeTab === 'data_table' && (
            <div className="h-full p-4 overflow-hidden">
              <DataTableModal
                isOpen={true}
                onClose={() => setActiveTab('viewport')}
                events={analyzedEvents}
                faults={faults}
                hazardThreshold={hazardThreshold}
                selectedEvent={selectedEvent}
                onSelectEvent={(ev) => {
                  setSelectedEvent(ev);
                  if (ev) {
                    addLog(`Selected event ${ev.id} from table.`);
                  }
                }}
              />
            </div>
          )}
        </main>
      </div>

      {/* Floating Data Table Modal when opened from Sidebar button */}
      {isModalOpen && activeTab !== 'data_table' && (
        <DataTableModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          events={analyzedEvents}
          faults={faults}
          hazardThreshold={hazardThreshold}
          selectedEvent={selectedEvent}
          onSelectEvent={(ev) => {
            setSelectedEvent(ev);
            setIsModalOpen(false);
            if (ev) {
              addLog(`Selected event ${ev.id} from table.`);
            }
          }}
        />
      )}
    </div>
  );
};
