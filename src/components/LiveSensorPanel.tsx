import React, { useState, useEffect, useMemo } from 'react';
import {
  Radio,
  Activity,
  Zap,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Flame,
  Bomb,
  TrendingUp,
  BarChart2,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { GeophoneSensor, AnalyzedEvent } from '../types';

interface LiveSensorPanelProps {
  sensors: GeophoneSensor[];
  isStreaming: boolean;
  onToggleStreaming: () => void;
  streamSpeed: number;
  onSetStreamSpeed: (speed: number) => void;
  liveEvents: AnalyzedEvent[];
  onTriggerEvent: (faultId?: string, magnitude?: number) => void;
  onTriggerBlast: () => void;
  onClearLiveStream: () => void;
  hazardThreshold: number;
}

interface EnergyDataPoint {
  time: string;
  minuteOffset: string;
  timestampMs: number;
  cumulativeEnergy: number; // Sum of magnitudes up to this time
  intervalEnergy: number; // Sum of magnitudes in this 2-min bucket
  eventCount: number;
}

export const LiveSensorPanel: React.FC<LiveSensorPanelProps> = ({
  sensors,
  isStreaming,
  onToggleStreaming,
  streamSpeed,
  onSetStreamSpeed,
  liveEvents,
  onTriggerEvent,
  onTriggerBlast,
  onClearLiveStream,
  hazardThreshold,
}) => {
  const [selectedSensor, setSelectedSensor] = useState<GeophoneSensor | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Background baseline events (ambient fracturing noise over the last 60 minutes)
  const [baselineEvents] = useState<Array<{ timestamp: number; magnitude: number }>>(() => {
    const now = Date.now();
    const list: Array<{ timestamp: number; magnitude: number }> = [];
    // 14 background microseismic events randomly distributed in the past 55 minutes
    const offsets = [54, 49, 44, 41, 36, 32, 27, 24, 20, 16, 12, 9, 6, 2];
    const mags = [0.65, 0.82, 0.74, 1.15, 0.92, 0.58, 1.34, 0.88, 0.76, 1.05, 0.98, 0.62, 1.12, 0.85];

    for (let i = 0; i < offsets.length; i++) {
      list.push({
        timestamp: now - offsets[i] * 60 * 1000,
        magnitude: mags[i],
      });
    }
    return list;
  });

  // Rolling timer tick every 4 seconds to advance the 60-minute window
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Compute live telemetry statistics
  const totalLive = liveEvents.length;
  const recentEvents = liveEvents.slice(0, 30);
  const highHazardLive = liveEvents.filter((e) => e.hazard_index >= hazardThreshold).length;

  const totalEnergyJoules = liveEvents.reduce(
    (acc, ev) => acc + (ev.energyJoules || Math.pow(10, 1.5 * ev.magnitude + 4.8)),
    0
  );

  // Combine baseline ambient events with live incoming events for the last 60 minutes
  const chartData: EnergyDataPoint[] = useMemo(() => {
    const windowDurationMs = 60 * 60 * 1000;
    const windowStartMs = currentTime - windowDurationMs;
    const bucketCount = 30; // 30 buckets of 2 minutes each
    const bucketStepMs = windowDurationMs / bucketCount;

    // Normalize all events (baseline + live stream) occurring in or near this window
    const normalizedEvents: Array<{ timestamp: number; magnitude: number }> = [];

    // Add baseline ambient events
    for (const b of baselineEvents) {
      if (b.timestamp >= windowStartMs && b.timestamp <= currentTime) {
        normalizedEvents.push(b);
      }
    }

    // Add incoming live events
    for (const ev of liveEvents) {
      const ts = ev.timestamp ? new Date(ev.timestamp).getTime() : currentTime;
      if (ts >= windowStartMs && ts <= currentTime + 5000) {
        normalizedEvents.push({
          timestamp: ts,
          magnitude: ev.magnitude,
        });
      }
    }

    // Sort chronologically
    normalizedEvents.sort((a, b) => a.timestamp - b.timestamp);

    // Build the 30 discrete time points
    const points: EnergyDataPoint[] = [];
    let runningCumulative = 0;

    for (let i = 0; i <= bucketCount; i++) {
      const bucketTimeMs = windowStartMs + i * bucketStepMs;
      const prevTimeMs = i === 0 ? windowStartMs - 1 : windowStartMs + (i - 1) * bucketStepMs;
      const bucketDate = new Date(bucketTimeMs);

      const timeLabel = bucketDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });

      const offsetMinutes = Math.round((bucketTimeMs - currentTime) / (60 * 1000));
      const minuteOffset = offsetMinutes === 0 ? 'Now' : `${offsetMinutes}m`;

      // Find events strictly falling inside this bucket
      let intervalMag = 0;
      let countInBucket = 0;

      for (const ev of normalizedEvents) {
        if (ev.timestamp > prevTimeMs && ev.timestamp <= bucketTimeMs) {
          intervalMag += ev.magnitude;
          countInBucket++;
        }
      }

      runningCumulative += intervalMag;

      points.push({
        time: timeLabel,
        minuteOffset,
        timestampMs: bucketTimeMs,
        cumulativeEnergy: Number(runningCumulative.toFixed(2)),
        intervalEnergy: Number(intervalMag.toFixed(2)),
        eventCount: countInBucket,
      });
    }

    return points;
  }, [currentTime, baselineEvents, liveEvents]);

  // Derived metrics from 60m chart
  const currentCumulativeM = chartData[chartData.length - 1]?.cumulativeEnergy || 0;
  const startCumulativeM = chartData[0]?.cumulativeEnergy || 0;
  const sixtyMinuteDeltaM = Math.max(0, currentCumulativeM - startCumulativeM);
  const totalEventsInWindow = chartData.reduce((acc, p) => acc + p.eventCount, 0);

  return (
    <div className="h-full overflow-y-auto bg-[#0f1115] text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header & Connection Status */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2d3139]">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span>Underground Microseismic Telemetry</span>
              <span>·</span>
              <span>8-Station Triaxial Array</span>
              <span>·</span>
              <span className={isStreaming ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                {isStreaming ? 'STREAMING ACTIVE' : 'PAUSED'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mt-1 flex items-center gap-2">
              <Radio
                className={`w-6 h-6 ${
                  isStreaming ? 'text-emerald-400 animate-pulse' : 'text-slate-400'
                }`}
              />
              Live Sensor Network & Dynamic Hazard Processor
            </h1>
          </div>

          {/* Master Stream Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleStreaming}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition shadow cursor-pointer ${
                isStreaming
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
              }`}
            >
              {isStreaming ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Sensor Stream</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Connect & Stream Sensors</span>
                </>
              )}
            </button>

            {/* Stream Speed Selector */}
            <div className="flex items-center bg-[#1a1d22] border border-[#2d3139] rounded-md p-1 text-xs">
              <span className="text-slate-400 px-2 text-[11px] font-mono">Rate:</span>
              {[1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => onSetStreamSpeed(speed)}
                  className={`px-2 py-1 rounded text-xs font-mono transition cursor-pointer ${
                    streamSpeed === speed
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>

            <button
              onClick={onClearLiveStream}
              title="Clear dynamic streaming events"
              className="p-2 bg-[#1a1d22] hover:bg-[#252a33] border border-[#2d3139] rounded-md text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Real-time Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-3.5">
            <span className="text-[11px] font-mono text-slate-400 block">Total Live Ingested</span>
            <div className="text-xl font-bold font-mono text-white mt-1">
              {totalLive.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-400 mt-1 block flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
              Dynamic P & S Wave Arrival
            </span>
          </div>

          <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-3.5">
            <span className="text-[11px] font-mono text-slate-400 block">High Hazard Triggers</span>
            <div className="text-xl font-bold font-mono text-red-400 mt-1">
              {highHazardLive.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Hi ≥ {hazardThreshold.toFixed(1)} threshold
            </span>
          </div>

          <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-3.5">
            <span className="text-[11px] font-mono text-slate-400 block">Radiated Seismic Energy</span>
            <div className="text-xl font-bold font-mono text-amber-400 mt-1">
              {(totalEnergyJoules / 1e6).toFixed(2)} MJ
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">Cumulative energy release</span>
          </div>

          <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-3.5">
            <span className="text-[11px] font-mono text-slate-400 block">Active Array Geophones</span>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
              {sensors.filter((s) => s.status === 'active').length} / {sensors.length}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">6 kHz / 12 kHz sampling</span>
          </div>
        </div>

        {/* Dynamic Recharts Cumulative Seismic Energy Line Chart (Prompt Requirement 1) */}
        <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-4 space-y-3 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#242831] pb-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-200 uppercase tracking-wider">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <span>Cumulative Seismic Energy Trend (Last 60 Minutes)</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 px-1.5 py-0.5 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto-Updating
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Displays the cumulative sum of microseismic magnitudes ($\sum M$) across the monitoring array over a rolling 60-minute window.
              </p>
            </div>

            {/* Quick Metrics Callout */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="bg-[#101216] px-3 py-1.5 rounded border border-[#2d3139]">
                <span className="text-slate-400 text-[10px] block">Cumulative Sum (ΣM)</span>
                <span className="text-base font-bold text-cyan-400">
                  {currentCumulativeM.toFixed(2)} M
                </span>
              </div>
              <div className="bg-[#101216] px-3 py-1.5 rounded border border-[#2d3139]">
                <span className="text-slate-400 text-[10px] block">60m Rate</span>
                <span className="text-base font-bold text-amber-400">
                  +{sixtyMinuteDeltaM.toFixed(2)} M/hr
                </span>
              </div>
              <div className="bg-[#101216] px-3 py-1.5 rounded border border-[#2d3139]">
                <span className="text-slate-400 text-[10px] block">Events in Window</span>
                <span className="text-base font-bold text-slate-100">
                  {totalEventsInWindow}
                </span>
              </div>
            </div>
          </div>

          {/* Recharts Dynamic Area / Line Chart Container */}
          <div className="h-64 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="seismicEnergyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  stroke="#202530"
                  strokeDasharray="3 3"
                  vertical={false}
                />

                <XAxis
                  dataKey="minuteOffset"
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                  dy={5}
                />

                <YAxis
                  stroke="#475569"
                  fontSize={10}
                  tickLine={false}
                  fontFamily="monospace"
                  tickFormatter={(val) => `${val.toFixed(1)} M`}
                  domain={[0, 'auto']}
                  dx={-2}
                />

                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as EnergyDataPoint;
                      return (
                        <div className="bg-[#12151b]/95 backdrop-blur-md border border-cyan-500/60 rounded-lg p-2.5 shadow-2xl text-xs font-mono text-slate-200">
                          <div className="text-[10px] text-slate-400 border-b border-[#2b303c] pb-1 mb-1.5 flex justify-between gap-4">
                            <span>Clock: {data.time}</span>
                            <span className="text-cyan-400 font-bold">{data.minuteOffset}</span>
                          </div>
                          <div className="flex justify-between gap-4 py-0.5">
                            <span className="text-slate-400">Cumulative Energy (ΣM):</span>
                            <span className="text-cyan-400 font-bold">
                              {data.cumulativeEnergy.toFixed(2)} M
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 py-0.5">
                            <span className="text-slate-400">2-Min Interval Energy:</span>
                            <span className="text-amber-400 font-semibold">
                              +{data.intervalEnergy.toFixed(2)} M
                            </span>
                          </div>
                          <div className="flex justify-between gap-4 py-0.5 text-[10px]">
                            <span className="text-slate-400">Events in Interval:</span>
                            <span className="text-white font-bold">{data.eventCount}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Subtle Area glow beneath line */}
                <Area
                  type="monotone"
                  dataKey="cumulativeEnergy"
                  stroke="none"
                  fill="url(#seismicEnergyGradient)"
                />

                {/* Primary dynamic Line for cumulative energy */}
                <Line
                  type="monotone"
                  dataKey="cumulativeEnergy"
                  stroke="#00e5ff"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 6,
                    fill: '#00e5ff',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-[#222732]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-[#00e5ff] inline-block rounded" />
              Cyan Line: Cumulative Sum of Magnitudes ($\sum M_i$)
            </span>
            <span>T - 60 Minutes &rarr; Real-Time Arrival (Now)</span>
          </div>
        </div>

        {/* Dynamic Simulation Triggers */}
        <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span>Interactive Operational Event Triggers (Test Dynamic Rock Mass Response)</span>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Inject realistic operational microseismic surges to observe real-time cumulative energy spikes on the chart, 3D spatial shockwaves, and updated ground support advisories:
          </p>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onTriggerBlast}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-700 to-amber-600 hover:from-orange-600 hover:to-amber-500 text-white rounded-md text-xs font-semibold shadow-sm transition cursor-pointer"
            >
              <Bomb className="w-3.5 h-3.5" />
              <span>Simulate Stope Production Blast (15 Events)</span>
            </button>

            <button
              onClick={() => onTriggerEvent('F-1', 3.2)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#252932] hover:bg-[#2e333e] border border-red-900/60 hover:border-red-700 text-red-300 rounded-md text-xs font-semibold transition cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>Trigger Fault F-1 Slip (M3.2 Burst)</span>
            </button>

            <button
              onClick={() => onTriggerEvent('F-2', 2.8)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#252932] hover:bg-[#2e333e] border border-amber-900/60 hover:border-amber-700 text-amber-300 rounded-md text-xs font-semibold transition cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Trigger Fault F-2 Slip (M2.8)</span>
            </button>

            <button
              onClick={() => onTriggerEvent()}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#252932] hover:bg-[#2e333e] border border-[#373c47] text-slate-200 rounded-md text-xs font-semibold transition cursor-pointer"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Trigger Single Microseismic Event</span>
            </button>
          </div>
        </div>

        {/* Two-Column Layout: Sensor Array Grid & Live Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Geophone Array Health */}
          <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Radio className="w-4 h-4 text-cyan-400" />
                <span>Geophone Station Array</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {sensors.length} Stations Configured
              </span>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {sensors.map((sensor) => (
                <div
                  key={sensor.id}
                  onClick={() => setSelectedSensor(sensor)}
                  className={`p-2.5 rounded-md border text-xs font-mono transition cursor-pointer flex items-center justify-between ${
                    selectedSensor?.id === sensor.id
                      ? 'bg-cyan-950/40 border-cyan-500'
                      : 'bg-[#101216] border-[#2d3139] hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <div>
                      <span className="font-bold text-white block">
                        {sensor.id}: {sensor.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        [{sensor.x}, {sensor.y}, {sensor.z}] m · {sensor.type}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 block font-semibold">
                      SNR: {sensor.signalToNoiseDb.toFixed(1)} dB
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {(sensor.sampleRateHz / 1000).toFixed(0)} kHz
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2: Live Incoming Event Feed */}
          <div className="bg-[#161920] border border-[#2d3139] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Live Event Stream Feed</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                {recentEvents.length} Recent Arrival Logs
              </span>
            </div>

            <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1 font-mono text-xs">
              {recentEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  {isStreaming ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      <span>Listening for microseismic triggers across array...</span>
                    </div>
                  ) : (
                    <span>Sensor stream is paused. Click &quot;Connect &amp; Stream Sensors&quot; above to start.</span>
                  )}
                </div>
              ) : (
                recentEvents.map((ev) => {
                  const isHigh = ev.hazard_index >= hazardThreshold;
                  return (
                    <div
                      key={ev.id}
                      className={`p-2 rounded border flex items-center justify-between transition ${
                        isHigh
                          ? 'bg-red-950/40 border-red-800/80 text-red-200'
                          : 'bg-[#101216] border-[#252830] text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isHigh ? 'bg-red-500 animate-pulse' : 'bg-cyan-400'
                            }`}
                          />
                          <span className="font-bold text-white text-[11px]">{ev.id}</span>
                          <span className="text-[10px] text-amber-400 font-semibold">
                            {ev.magnitude.toFixed(2)} M
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Fault: <strong className="text-cyan-300">{ev.nearest_fault_id}</strong> (
                          {ev.distance_to_fault.toFixed(1)}m)
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isHigh
                              ? 'bg-red-900 text-red-200'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          Hi: {ev.hazard_index.toFixed(3)}
                        </span>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {new Date(ev.timestamp || Date.now()).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
