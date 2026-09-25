import React, { useState, useMemo } from 'react';
import { X, Search, Filter, Layers, Download, Check } from 'lucide-react';
import { AnalyzedEvent, FaultPlane } from '../types';

interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: AnalyzedEvent[];
  faults: FaultPlane[];
  hazardThreshold: number;
  selectedEvent: AnalyzedEvent | null;
  onSelectEvent: (event: AnalyzedEvent | null) => void;
}

export const DataTableModal: React.FC<DataTableModalProps> = ({
  isOpen,
  onClose,
  events,
  faults,
  hazardThreshold,
  selectedEvent,
  onSelectEvent,
}) => {
  const [activeTab, setActiveTab] = useState<'events' | 'faults'>('events');
  const [search, setSearch] = useState('');
  const [onlyHighHazard, setOnlyHighHazard] = useState(false);
  const [sortBy, setSortBy] = useState<'hazard_index' | 'magnitude' | 'distance_to_fault' | 'id'>('hazard_index');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const filteredEvents = useMemo(() => {
    let list = events;

    if (onlyHighHazard) {
      list = list.filter((e) => e.hazard_index >= hazardThreshold);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          String(e.id).toLowerCase().includes(q) ||
          e.nearest_fault_id.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let vA = a[sortBy];
      let vB = b[sortBy];
      if (typeof vA === 'string') {
        return sortAsc
          ? (vA as string).localeCompare(vB as string)
          : (vB as string).localeCompare(vA as string);
      }
      return sortAsc ? (vA as number) - (vB as number) : (vB as number) - (vA as number);
    });
  }, [events, onlyHighHazard, hazardThreshold, search, sortBy, sortAsc]);

  const pagedEvents = useMemo(() => {
    return filteredEvents.slice(page * pageSize, (page + 1) * pageSize);
  }, [filteredEvents, page, pageSize]);

  const totalPages = Math.ceil(filteredEvents.length / pageSize);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-[#1e1f22] border border-[#3f4248] rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#3f4248] flex items-center justify-between bg-[#2b2d31]">
          <div className="flex items-center gap-3">
            <div className="flex bg-[#1e1f22] p-1 rounded-lg border border-[#3f4248]">
              <button
                onClick={() => {
                  setActiveTab('events');
                  setPage(0);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  activeTab === 'events'
                    ? 'bg-[#0288d1] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Microseismic Events ({events.length.toLocaleString()})
              </button>
              <button
                onClick={() => {
                  setActiveTab('faults');
                  setPage(0);
                }}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                  activeTab === 'faults'
                    ? 'bg-[#0288d1] text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fault Structures ({faults.length})
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#35383f] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar for Events */}
        {activeTab === 'events' && (
          <div className="p-3 border-b border-[#3f4248] bg-[#24272c] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-1 min-w-[260px]">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search ID or nearest fault..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="w-full bg-[#1e1f22] border border-[#3f4248] rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-[#4fc3f7]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={onlyHighHazard}
                  onChange={(e) => {
                    setOnlyHighHazard(e.target.checked);
                    setPage(0);
                  }}
                  className="rounded bg-[#1e1f22] border-[#3f4248] text-[#ff1744] focus:ring-0"
                />
                <span className="text-[11px] font-medium">
                  High Hazard Only (≥ {hazardThreshold.toFixed(1)})
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2 text-slate-400">
              <span>Showing {filteredEvents.length.toLocaleString()} matching</span>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'events' ? (
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead className="sticky top-0 bg-[#2b2d31] text-[#b0bec5] border-b border-[#3f4248] uppercase tracking-wider text-[10px]">
                <tr>
                  <th
                    className="p-2.5 cursor-pointer hover:text-white"
                    onClick={() => {
                      if (sortBy === 'id') setSortAsc(!sortAsc);
                      else {
                        setSortBy('id');
                        setSortAsc(true);
                      }
                    }}
                  >
                    Event ID
                  </th>
                  <th className="p-2.5 text-right">Easting (X)</th>
                  <th className="p-2.5 text-right">Northing (Y)</th>
                  <th className="p-2.5 text-right">Elevation (Z)</th>
                  <th
                    className="p-2.5 text-right cursor-pointer hover:text-white"
                    onClick={() => {
                      if (sortBy === 'magnitude') setSortAsc(!sortAsc);
                      else {
                        setSortBy('magnitude');
                        setSortAsc(false);
                      }
                    }}
                  >
                    Magnitude (M)
                  </th>
                  <th
                    className="p-2.5 text-right cursor-pointer hover:text-white"
                    onClick={() => {
                      if (sortBy === 'distance_to_fault') setSortAsc(!sortAsc);
                      else {
                        setSortBy('distance_to_fault');
                        setSortAsc(true);
                      }
                    }}
                  >
                    Distance (m)
                  </th>
                  <th className="p-2.5 text-center">Nearest Fault</th>
                  <th
                    className="p-2.5 text-right cursor-pointer hover:text-white"
                    onClick={() => {
                      if (sortBy === 'hazard_index') setSortAsc(!sortAsc);
                      else {
                        setSortBy('hazard_index');
                        setSortAsc(false);
                      }
                    }}
                  >
                    Hazard Index
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3036]">
                {pagedEvents.map((row) => {
                  const isHigh = row.hazard_index >= hazardThreshold;
                  const isSelected = selectedEvent?.id === row.id;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => onSelectEvent(row)}
                      className={`hover:bg-[#2b2d31]/80 cursor-pointer transition ${
                        isSelected
                          ? 'bg-[#0288d1]/30 border-l-4 border-[#00e5ff]'
                          : isHigh
                          ? 'bg-red-950/20'
                          : ''
                      }`}
                    >
                      <td className="p-2.5 font-bold text-slate-200">{row.id}</td>
                      <td className="p-2.5 text-right text-slate-400">{row.x.toFixed(1)}</td>
                      <td className="p-2.5 text-right text-slate-400">{row.y.toFixed(1)}</td>
                      <td className="p-2.5 text-right text-slate-400">{row.z.toFixed(1)}</td>
                      <td className="p-2.5 text-right text-amber-400 font-semibold">
                        {row.magnitude.toFixed(2)}
                      </td>
                      <td className="p-2.5 text-right text-slate-300">
                        {row.distance_to_fault.toFixed(1)}
                      </td>
                      <td className="p-2.5 text-center text-[#4fc3f7] font-semibold">
                        {row.nearest_fault_id}
                      </td>
                      <td className="p-2.5 text-right font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11px] ${
                            isHigh
                              ? 'bg-red-900/60 text-[#ff8a80] border border-red-700/60'
                              : 'text-slate-300'
                          }`}
                        >
                          {row.hazard_index.toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="w-full border-collapse text-left text-xs font-mono">
              <thead className="sticky top-0 bg-[#2b2d31] text-[#b0bec5] border-b border-[#3f4248] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="p-2.5">Fault ID</th>
                  <th className="p-2.5 text-right">Center X (m)</th>
                  <th className="p-2.5 text-right">Center Y (m)</th>
                  <th className="p-2.5 text-right">Center Z (m)</th>
                  <th className="p-2.5 text-right">Radius (m)</th>
                  <th className="p-2.5 text-right">Dip (°)</th>
                  <th className="p-2.5 text-right">Dip Dir (°)</th>
                  <th className="p-2.5 text-center">Normal [Nx, Ny, Nz]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3036]">
                {faults.map((f) => (
                  <tr key={f.fault_id} className="hover:bg-[#2b2d31]/80">
                    <td className="p-2.5 font-bold text-[#4fc3f7]">{f.fault_id}</td>
                    <td className="p-2.5 text-right text-slate-300">{f.x.toFixed(1)}</td>
                    <td className="p-2.5 text-right text-slate-300">{f.y.toFixed(1)}</td>
                    <td className="p-2.5 text-right text-slate-300">{f.z.toFixed(1)}</td>
                    <td className="p-2.5 text-right text-slate-200 font-semibold">{f.radius.toFixed(1)}</td>
                    <td className="p-2.5 text-right text-slate-400">
                      {f.dip !== undefined ? `${f.dip.toFixed(1)}°` : '—'}
                    </td>
                    <td className="p-2.5 text-right text-slate-400">
                      {f.dip_direction !== undefined ? `${f.dip_direction.toFixed(1)}°` : '—'}
                    </td>
                    <td className="p-2.5 text-center text-slate-400 font-mono text-[10px]">
                      {f.normalX !== undefined
                        ? `[${f.normalX.toFixed(2)}, ${f.normalY?.toFixed(2)}, ${f.normalZ?.toFixed(2)}]`
                        : 'Calculated'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal Footer with Pagination */}
        {activeTab === 'events' && (
          <div className="p-3 border-t border-[#3f4248] bg-[#2b2d31] flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Page {page + 1} of {Math.max(1, totalPages)}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-[#35383f] hover:bg-[#474b54] disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-200 transition"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-[#35383f] hover:bg-[#474b54] disabled:opacity-40 disabled:cursor-not-allowed rounded text-slate-200 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
