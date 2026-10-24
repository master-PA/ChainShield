import React, { useState } from 'react';
import { Binary, ShieldAlert, Search, Filter, Hash, ExternalLink, Zap } from 'lucide-react';
import { DRAINER_KITS } from '../data/drainerKits';
import { StatusBadge } from '../components/layout/StatusBadge';
import { useSecurity } from '../context/SecurityContext';

export const DrainerKits: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  const { isDemoDataset } = useSecurity();
  const [search, setSearch] = useState('');
  const [selectedKit, setSelectedKit] = useState<(typeof DRAINER_KITS)[0] | null>(DRAINER_KITS[0]);

  const filtered = DRAINER_KITS.filter(
    (k) =>
      k.name.toLowerCase().includes(search.toLowerCase()) ||
      k.family.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-zinc-100">Web3 Drainer Kit Signature Library</h1>
            {isDemoDataset && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                Demo dataset
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Defensive MinHash code fingerprints, EIP-712 permit selectors, and telemetry beacons (No offensive exploits)
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search kit family or token..."
            className="w-full bg-[#161D26] border border-[#1F2630] rounded-md pl-9 pr-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kits List */}
        <div className="lg:col-span-1 space-y-2">
          {filtered.map((kit) => {
            const isSelected = selectedKit?.id === kit.id;
            return (
              <div
                key={kit.id}
                onClick={() => setSelectedKit(kit)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-teal-950/40 border-teal-600 text-teal-200'
                    : 'bg-[#11161D] border-[#1F2630] hover:border-zinc-700 text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-100">{kit.name}</span>
                  <StatusBadge level={kit.riskLevel} size="sm" />
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                  {kit.family} • Seen: {kit.firstSeen}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#1F2630]/60 text-[10px] font-mono">
                  <span className="text-rose-400 font-bold">{kit.detectionsThisWeek} matches/wk</span>
                  <span className="text-zinc-500">{kit.totalDetections} total</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Kit Dossier */}
        <div className="lg:col-span-2">
          {selectedKit ? (
            <div className="p-5 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1F2630] pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-zinc-100">{selectedKit.name}</h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#161D26] text-zinc-400 border border-[#1F2630]">
                      Status: {selectedKit.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 font-mono">
                    Threat Family: {selectedKit.family} • First Observed: {selectedKit.firstSeen}
                  </div>
                </div>
                <StatusBadge level={selectedKit.riskLevel} size="md" />
              </div>

              {/* Attack Vectors */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 mb-2">Identified Attack Vectors</h3>
                <div className="space-y-1.5">
                  {selectedKit.attackVectors.map((vec, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded bg-[#0E131A] border border-[#1F2630] text-xs text-zinc-300 flex items-center space-x-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span>{vec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Defensive Signatures */}
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 mb-2">
                  Defensive Code Signatures & MinHash Shingles
                </h3>
                <div className="space-y-1.5 font-mono text-xs">
                  {selectedKit.defensiveSignatures.map((sig, i) => (
                    <div
                      key={i}
                      className="p-2.5 rounded bg-[#0E131A] border border-[#1F2630] text-teal-400 break-all"
                    >
                      {sig}
                    </div>
                  ))}
                </div>
              </div>

              {/* Fingerprint Hash */}
              <div className="p-3 rounded bg-[#0E131A] border border-[#1F2630]">
                <span className="text-[10px] font-mono text-zinc-500 block uppercase">
                  CANONICAL DEFENSIVE FINGERPRINT HASH (SHA-256)
                </span>
                <span className="text-xs font-mono text-zinc-300 break-all block mt-1">
                  {selectedKit.fingerprintHash}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-lg bg-[#11161D] border border-[#1F2630] text-center text-zinc-500">
              Select a drainer kit to view technical dossier.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
