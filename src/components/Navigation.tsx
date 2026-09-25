import React from 'react';
import {
  Activity,
  Layers,
  FileText,
  Radio,
  Table,
  Play,
  Pause,
  Download,
} from 'lucide-react';
import { GroundSupportLevel } from '../types';

export type ActiveTab = 'viewport' | 'report' | 'live_sensors' | 'data_table';

interface NavigationProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isStreaming: boolean;
  toggleStreaming: () => void;
  supportLevel?: GroundSupportLevel;
  onOpenExportMenu?: () => void;
  onQuickRunAnalysis: () => void;
  isAnalyzing: boolean;
  canRun: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  isStreaming,
  toggleStreaming,
  supportLevel,
  onQuickRunAnalysis,
  isAnalyzing,
  canRun,
}) => {
  return (
    <header className="h-14 border-b border-[#2d3139] bg-[#121417] px-4 flex items-center justify-between select-none z-30 shrink-0">
      {/* Zone 1: Single element Brand Wordmark */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setActiveTab('viewport')}
          className="flex items-center gap-2.5 text-left focus:outline-none cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-md bg-gradient-to-tr from-cyan-600 to-sky-400 flex items-center justify-center shadow-sm shadow-cyan-900/40">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              GeoShield-3D
            </span>
          </div>
        </button>

        {/* Quiet status beacon */}
        <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-[#2d3139] text-xs text-slate-400">
          <span
            className={`w-2 h-2 rounded-full ${
              isStreaming ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
            }`}
          />
          <span className="font-mono text-[11px]">
            {isStreaming ? 'ARRAY ONLINE' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links / Segmented Views */}
      <nav className="flex items-center gap-1 bg-[#1a1d22] p-1 rounded-lg border border-[#2d3139]">
        <button
          onClick={() => setActiveTab('viewport')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'viewport'
              ? 'bg-[#2b2f38] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>3D Viewport</span>
        </button>

        <button
          onClick={() => setActiveTab('report')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'report'
              ? 'bg-[#2b2f38] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-amber-400" />
          <span>Ground Support Report</span>
          {supportLevel && (
            <span
              className={`hidden sm:inline text-[10px] font-mono px-1 rounded ${
                supportLevel.includes('Critical')
                  ? 'bg-red-950 text-red-300'
                  : supportLevel.includes('Heavy')
                  ? 'bg-amber-950 text-amber-300'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {supportLevel.split(' ')[0]}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('live_sensors')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'live_sensors'
              ? 'bg-[#2b2f38] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          <span>Live Sensors</span>
          {isStreaming && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('data_table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            activeTab === 'data_table'
              ? 'bg-[#2b2f38] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Table className="w-3.5 h-3.5 text-sky-400" />
          <span>Data Table</span>
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-2">
        {/* Live Stream toggle button */}
        <button
          onClick={toggleStreaming}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
            isStreaming
              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 hover:bg-emerald-900'
              : 'bg-[#24272e] text-slate-300 border border-[#373c46] hover:bg-[#2d323c]'
          }`}
          title={isStreaming ? 'Pause live sensor stream' : 'Connect and stream live microseismic geophones'}
        >
          {isStreaming ? (
            <>
              <Pause className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sensors Live</span>
            </>
          ) : (
            <>
              <Radio className="w-3.5 h-3.5 text-slate-400" />
              <span>Start Sensor Feed</span>
            </>
          )}
        </button>

        {/* Run Spatial Analysis action */}
        <button
          disabled={!canRun}
          onClick={onQuickRunAnalysis}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold text-white transition-colors cursor-pointer ${
            canRun
              ? 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 shadow-sm shadow-cyan-900/50'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span>{isAnalyzing ? 'Calculating...' : 'Recalculate'}</span>
        </button>
      </div>
    </header>
  );
};
