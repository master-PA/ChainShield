import React, { useState } from 'react';
import { FileText, Download, Search, CheckCircle2, ExternalLink, Filter } from 'lucide-react';
import { StatusBadge } from '../components/layout/StatusBadge';
import { useSecurity } from '../context/SecurityContext';
import { formatTimeAgo } from '../lib/formatters';

export const Reports: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  const { allScans, isDemoDataset } = useSecurity();
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [selectedReportRaw, setSelectedReportRaw] = useState<(typeof allScans)[0] | null>(null);

  const filtered = allScans.filter((s) => {
    const matchesSearch = s.target.toLowerCase().includes(search.toLowerCase());
    const matchesLevel = levelFilter === 'ALL' || s.riskLevel === levelFilter;
    return matchesSearch && matchesLevel;
  });

  const handleExportCSV = () => {
    const headers = 'ID,Target,RiskScore,RiskLevel,Recommendation,LinkSource,SepoliaHash,Timestamp\n';
    const rows = filtered
      .map(
        (s) =>
          `"${s.id}","${s.target}",${s.riskScore},"${s.riskLevel}","${s.recommendation}","${s.linkSource}","${s.evidence?.canonicalHash || ''}","${new Date(s.createdAt).toISOString()}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentinel-reports-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-zinc-100">Security Reports & Evidence Archive</h1>
            {isDemoDataset && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                Demo dataset
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Immutable pre-transaction risk assessments anchored with canonical SHA-256 proofs
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-3.5 py-1.5 rounded bg-[#161D26] hover:bg-[#1F2634] text-zinc-200 border border-[#1F2630] font-medium text-xs flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-teal-400" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search report targets or hashes..."
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

      {/* Reports Table */}
      <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2630] text-zinc-500 font-mono text-[11px]">
                <th className="pb-2 font-normal">REPORT ID</th>
                <th className="pb-2 font-normal">TARGET</th>
                <th className="pb-2 font-normal">RISK SCORE</th>
                <th className="pb-2 font-normal">RECOMMENDATION</th>
                <th className="pb-2 font-normal">PROOF STATUS</th>
                <th className="pb-2 font-normal">AUDITED</th>
                <th className="pb-2 font-normal text-right">INSPECT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2630]/60">
              {filtered.map((report) => (
                <tr key={report.id} className="hover:bg-[#161D26]/60 transition-colors">
                  <td className="py-3 font-mono text-teal-400 font-semibold">
                    {report.evidence?.reportId || report.id.slice(0, 10)}
                  </td>
                  <td className="py-3 font-mono text-zinc-200 truncate max-w-[220px]">
                    {report.target}
                  </td>
                  <td className="py-3">
                    <StatusBadge level={report.riskLevel} score={report.riskScore} size="sm" />
                  </td>
                  <td className="py-3 font-mono text-[11px] text-zinc-400">
                    {report.recommendation.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3">
                    {report.evidence?.isAnchored ? (
                      <span className="inline-flex items-center space-x-1 text-teal-400 font-mono text-[11px]">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Sepolia #{report.evidence.canonicalHash.slice(0, 6)}</span>
                      </span>
                    ) : (
                      <span className="text-zinc-500 font-mono text-[11px]">Pending Anchor</span>
                    )}
                  </td>
                  <td className="py-3 text-zinc-500 font-mono text-[11px]">
                    {formatTimeAgo(report.createdAt)}
                  </td>
                  <td className="py-3 text-right space-x-2">
                    <button
                      onClick={() => setSelectedReportRaw(report)}
                      className="text-zinc-400 hover:text-zinc-200 text-[11px] font-mono underline"
                    >
                      Raw JSON
                    </button>
                    <button
                      onClick={() => navigate(`/verify?reportId=${report.evidence?.reportId}`)}
                      className="text-teal-400 hover:underline text-[11px] font-mono"
                    >
                      Verify
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Canonical JSON Modal */}
      {selectedReportRaw && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#11161D] border border-[#1F2630] rounded-xl max-w-xl w-full p-5 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F2630] pb-2">
              <h3 className="text-xs font-mono font-semibold text-zinc-200">
                Canonical JSON Payload • Report #{selectedReportRaw.evidence?.reportId}
              </h3>
              <button
                onClick={() => setSelectedReportRaw(null)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>
            <pre className="p-3 rounded bg-[#0E131A] border border-[#1F2630] font-mono text-[11px] text-zinc-300 max-h-80 overflow-y-auto leading-relaxed">
              {JSON.stringify(selectedReportRaw, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
