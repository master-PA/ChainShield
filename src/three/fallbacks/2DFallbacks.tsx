import React from 'react';
import { Shield, Globe, Lock, AlertTriangle } from 'lucide-react';
import { RiskLevel } from '../../types/security';

export const HeroFallback2D: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="relative w-36 h-36 flex items-center justify-center border border-teal-500/30 rounded-2xl bg-[#11161D]">
        <Shield className="w-16 h-16 text-teal-400 stroke-1" />
        <div className="absolute inset-0 rounded-2xl border border-dashed border-teal-500/20" />
      </div>
      <p className="mt-4 text-xs font-mono text-zinc-400 uppercase tracking-widest">
        Sentinel Cryptographic Shield [2D Mode]
      </p>
    </div>
  );
};

export const ThreatGlobeFallback2D: React.FC<{ selectedCategory?: string }> = ({ selectedCategory }) => {
  return (
    <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 bg-[#0E131A] rounded-lg border border-[#1F2630]">
      <Globe className="w-16 h-16 text-teal-500/60 stroke-1 mb-3" />
      <span className="text-sm font-medium text-zinc-300">Global Threat Operations Map</span>
      <span className="text-xs text-zinc-500 mt-1">
        2D Projection Mode {selectedCategory ? `• Filter: ${selectedCategory}` : ''}
      </span>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center w-full max-w-xs">
        <div className="bg-[#161D26] p-2 rounded border border-[#1F2630]">
          <div className="text-xs font-mono text-rose-400 font-semibold">1,420</div>
          <div className="text-[10px] text-zinc-400">NA Drainers</div>
        </div>
        <div className="bg-[#161D26] p-2 rounded border border-[#1F2630]">
          <div className="text-xs font-mono text-orange-400 font-semibold">982</div>
          <div className="text-[10px] text-zinc-400">EU Phishing</div>
        </div>
        <div className="bg-[#161D26] p-2 rounded border border-[#1F2630]">
          <div className="text-xs font-mono text-amber-400 font-semibold">1,894</div>
          <div className="text-[10px] text-zinc-400">APAC Clones</div>
        </div>
      </div>
    </div>
  );
};

export const RiskCoreFallback2D: React.FC<{ score: number; level: RiskLevel }> = ({ score, level }) => {
  const isHigh = score >= 50;
  return (
    <div className="w-24 h-24 flex flex-col items-center justify-center rounded-xl border border-[#1F2630] bg-[#11161D]">
      {isHigh ? (
        <AlertTriangle className={`w-8 h-8 ${score >= 75 ? 'text-rose-500' : 'text-orange-500'}`} />
      ) : (
        <Lock className={`w-8 h-8 ${score >= 25 ? 'text-amber-500' : 'text-emerald-500'}`} />
      )}
      <span className="text-xs font-mono mt-1 font-bold">{score}/100</span>
      <span className="text-[9px] uppercase tracking-wider text-zinc-400">{level}</span>
    </div>
  );
};

export const EvidenceChainFallback2D: React.FC<{
  verifiedHash: string;
  isAnchored: boolean;
}> = ({ verifiedHash, isAnchored }) => {
  return (
    <div className="w-full p-4 rounded-lg bg-[#0E131A] border border-[#1F2630] flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-9 h-9 rounded bg-[#161D26] border border-teal-500/40 flex items-center justify-center font-mono text-xs text-teal-400 font-bold">
          #541
        </div>
        <div>
          <div className="text-xs text-zinc-300 font-medium">Anchored Sepolia Block</div>
          <div className="text-[11px] font-mono text-zinc-500">{verifiedHash.slice(0, 20)}...</div>
        </div>
      </div>
      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-teal-950/50 text-teal-300 border border-teal-800/60">
        {isAnchored ? 'CRYPTOGRAPHICALLY ANCHORED' : 'PENDING BLOCK'}
      </span>
    </div>
  );
};
