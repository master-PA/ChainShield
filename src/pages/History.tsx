import React, { useState } from 'react';
import { History as HistoryIcon, Search, Filter, CheckCircle2, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../components/layout/StatusBadge';
import { useSecurity } from '../context/SecurityContext';
import { formatTimeAgo } from '../lib/formatters';

export const History: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  const { allScans, runTargetScan, isDemoDataset } = useSecurity();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');

  const filtered = allScans.filter((s) => {
    const matchesSearch = s.target.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'ALL' || s.riskLevel === levelFilter;
    return matchesSearch && matchesLevel;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-zinc-100">Complete Scan History</h1>
            {isDemoDataset && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                Demo dataset
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Log of all target checks, calldata audits, and simulation results
          </p>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search targets or domains in history..."
            className="w-full bg-[#161D26] border border-[#1F2630] rounded-md pl-9 pr-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-zinc-500" />
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="bg-[#161D26] border border-[#1F2630] rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-teal-500 font-mono"
          >
            <option value="ALL">ALL RISK LEVELS</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="CAUTION">CAUTION</option>
            <option value="LOW">LOW</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2630] text-zinc-500 font-mono text-[11px]">
                <th className="pb-2 font-normal">TARGET / CALLDATA</th>
                <th className="pb-2 font-normal">RISK SCORE</th>
                <th className="pb-2 font-normal">LINK SOURCE</th>
                <th className="pb-2 font-normal">RECOMMENDATION</th>
                <th className="pb-2 font-normal">SEPOLIA PROOF</th>
                <th className="pb-2 font-normal">AUDITED</th>
                <th className="pb-2 font-normal text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2630]/60">
              {filtered.map((scan) => (
                <tr key={scan.id} className="hover:bg-[#161D26]/60 transition-colors">
                  <td className="py-3 font-mono text-zinc-200 truncate max-w-[220px]">
                    {scan.target}
                  </td>
                  <td className="py-3">
                    <StatusBadge level={scan.riskLevel} score={scan.riskScore} size="sm" />
                  </td>
                  <td className="py-3 font-mono text-[11px] text-zinc-400 uppercase">
                    {scan.linkSource.replace('_', ' ')}
                  </td>
                  <td className="py-3 font-mono text-[11px] text-zinc-300">
                    {scan.recommendation.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3">
                    {scan.evidence?.isAnchored ? (
                      <span className="inline-flex items-center space-x-1 text-teal-400 font-mono text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{scan.evidence.canonicalHash.slice(0, 8)}...</span>
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-mono text-[11px]">Pending Anchor</span>
                    )}
                  </td>
                  <td className="py-3 text-zinc-500 font-mono text-[11px]">
                    {formatTimeAgo(scan.createdAt)}
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => {
                        runTargetScan(scan.target);
                        navigate(`/scanner?target=${encodeURIComponent(scan.target)}`);
                      }}
                      className="text-teal-400 hover:underline text-[11px] font-mono"
                    >
                      Inspect in Scanner
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
