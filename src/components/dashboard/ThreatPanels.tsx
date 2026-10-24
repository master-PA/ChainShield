import React from 'react';
import { ShieldAlert, ExternalLink, Radio, Layers, Zap } from 'lucide-react';
import { StatusBadge } from '../layout/StatusBadge';
import { DRAINER_KITS } from '../../data/drainerKits';
import { formatTimeAgo } from '../../lib/formatters';

interface ThreatFeedProps {
  onSelectTarget: (target: string) => void;
}

export const ThreatFeed: React.FC<ThreatFeedProps> = ({ onSelectTarget }) => {
  const liveThreats = [
    {
      id: 'tf-1',
      target: 'https://mintzone-nft.xyz',
      category: 'Inferno Drainer Clone',
      level: 'CRITICAL' as const,
      score: 91,
      source: 'Telegram DM',
      time: Date.now() - 1000 * 60 * 12,
    },
    {
      id: 'tf-2',
      target: 'https://app-sync-fix.org',
      category: 'Mnemonic Seed Phishing',
      level: 'CRITICAL' as const,
      score: 95,
      source: 'Support Impersonation',
      time: Date.now() - 1000 * 60 * 45,
    },
    {
      id: 'tf-3',
      target: '0x9918237F012891c92019b882019481bc9018274a',
      category: 'Honeypot Token (Blacklist Sell Revert)',
      level: 'HIGH' as const,
      score: 82,
      source: 'DEX Screener Swap',
      time: Date.now() - 1000 * 60 * 110,
    },
    {
      id: 'tf-4',
      target: 'https://collab-land-verify.link',
      category: 'Discord Bot Signature Stealer',
      level: 'CRITICAL' as const,
      score: 88,
      source: 'Discord DM',
      time: Date.now() - 1000 * 60 * 240,
    },
  ];

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          <h3 className="text-xs font-semibold text-zinc-200">Live Threat Feed</h3>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">Auto-refresh (15s)</span>
      </div>

      <div className="space-y-2 overflow-y-auto max-h-[220px]">
        {liveThreats.map((threat) => (
          <div
            key={threat.id}
            onClick={() => onSelectTarget(threat.target)}
            className="p-2.5 rounded bg-[#0E131A] border border-[#1F2630] hover:border-zinc-700 cursor-pointer transition-colors flex items-center justify-between"
          >
            <div className="min-w-0 pr-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-medium text-zinc-200 truncate">
                  {threat.target}
                </span>
                <ExternalLink className="w-3 h-3 text-zinc-500 shrink-0" />
              </div>
              <div className="flex items-center space-x-2 mt-1 text-[11px] text-zinc-400">
                <span>{threat.category}</span>
                <span>•</span>
                <span className="text-zinc-500">{threat.source}</span>
                <span>•</span>
                <span className="text-zinc-500">{formatTimeAgo(threat.time)}</span>
              </div>
            </div>
            <StatusBadge level={threat.level} score={threat.score} size="sm" />
          </div>
        ))}
      </div>
    </div>
  );
};

export const TopCategories: React.FC<{
  onSelectCategory: (cat: string) => void;
  selectedCategory?: string;
}> = ({ onSelectCategory, selectedCategory }) => {
  const categories = [
    { id: 'drainer', name: 'Drainer Kit Clones', count: 1845, share: '38%', color: 'text-rose-400' },
    { id: 'lookalike', name: 'Look-Alike Typosquats', count: 1210, share: '25%', color: 'text-orange-400' },
    { id: 'fake_airdrop', name: 'Fake Airdrop Lures', count: 890, share: '18%', color: 'text-amber-400' },
    { id: 'approval_trap', name: 'Blanket Approval Traps', count: 540, share: '11%', color: 'text-rose-400' },
    { id: 'honeypot', name: 'Honeypot Tokens', count: 385, share: '8%', color: 'text-zinc-400' },
  ];

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold text-zinc-200">Top Scam Categories</h3>
          <p className="text-[11px] text-zinc-500">Distribution by threat vector</p>
        </div>
        <Layers className="w-4 h-4 text-zinc-500" />
      </div>

      <div className="space-y-1.5">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(isSelected ? 'all' : cat.id)}
              className={`w-full flex items-center justify-between p-2 rounded text-xs border transition-colors ${
                isSelected
                  ? 'bg-teal-950/60 border-teal-700 text-teal-300'
                  : 'bg-[#0E131A] border-[#1F2630] hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <span className="font-medium">{cat.name}</span>
              <div className="flex items-center space-x-2 font-mono text-[11px]">
                <span className={cat.color}>{cat.count}</span>
                <span className="text-zinc-500">({cat.share})</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const DrainerKitPanel: React.FC<{ onNavigateToKits: () => void }> = ({ onNavigateToKits }) => {
  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold text-zinc-200">Drainer Kit Detections</h3>
          <p className="text-[11px] text-zinc-500">Matches this week by family</p>
        </div>
        <button
          onClick={onNavigateToKits}
          className="text-[11px] font-mono text-teal-400 hover:underline"
        >
          View Library →
        </button>
      </div>

      <div className="space-y-2">
        {DRAINER_KITS.slice(0, 4).map((kit) => (
          <div
            key={kit.id}
            className="p-2 rounded bg-[#0E131A] border border-[#1F2630] flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                <span>{kit.name}</span>
                <span className="text-[9px] font-mono px-1 py-0.2 bg-[#161D26] text-zinc-400 rounded">
                  {kit.family.split('/')[0]}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[200px]">
                {kit.attackVectors[0]}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-mono font-bold text-rose-400">
                {kit.detectionsThisWeek}
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">this week</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
