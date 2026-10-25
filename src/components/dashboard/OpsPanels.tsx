import React from 'react';
import { Award, Cpu, Wifi, CheckCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { DEMO_MODEL_METRICS, DEMO_PROVIDER_HEALTH } from '../../data/seedData';

export const CommunityLeadersPanel: React.FC<{ onNavigateCommunity: () => void }> = ({
  onNavigateCommunity,
}) => {
  const leaders = [
    { rank: 1, handle: '0x89...42a1', reports: 48, accuracy: '98.2%', rep: 94, stakeReturned: '3.4 ETH' },
    { rank: 2, handle: '0xPriyaSecurity...90ff', reports: 62, accuracy: '96.8%', rep: 96, stakeReturned: '4.8 ETH' },
    { rank: 3, handle: '0xSentry99...11b2', reports: 31, accuracy: '94.5%', rep: 88, stakeReturned: '1.9 ETH' },
  ];

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-xs font-semibold text-zinc-200">Community Intelligence Leaders</h3>
        </div>
        <button
          onClick={onNavigateCommunity}
          className="text-[11px] font-mono text-teal-400 hover:underline"
        >
          Leaderboard →
        </button>
      </div>

      <div className="space-y-2">
        {leaders.map((leader) => (
          <div
            key={leader.rank}
            className="p-2 rounded bg-[#0E131A] border border-[#1F2630] flex items-center justify-between text-xs"
          >
            <div className="flex items-center space-x-2.5">
              <span className="w-5 h-5 rounded-full bg-[#161D26] border border-[#1F2630] flex items-center justify-center font-mono text-[10px] text-zinc-400 font-bold">
                #{leader.rank}
              </span>
              <div>
                <span className="font-mono text-zinc-200">{leader.handle}</span>
                <div className="text-[10px] text-zinc-500 font-mono">
                  {leader.reports} verified reports • {leader.stakeReturned} rewarded
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-teal-400 font-semibold">{leader.rep} REP</span>
              <div className="text-[10px] text-emerald-400 font-mono">{leader.accuracy} acc</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ModelPanel: React.FC = () => {
  const model = DEMO_MODEL_METRICS[0];

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Cpu className="w-4 h-4 text-teal-400" />
          <div>
            <h3 className="text-xs font-semibold text-zinc-200">{model.name}</h3>
            <span className="text-[10px] font-mono text-zinc-500">{model.algorithm}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
          {model.version}
        </span>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-4 gap-2 my-2 text-center">
        <div className="p-1.5 rounded bg-[#0E131A] border border-[#1F2630]">
          <div className="text-[10px] text-zinc-500 font-mono">Precision</div>
          <div className="text-xs font-mono font-bold text-teal-400">{(model.precision * 100).toFixed(1)}%</div>
        </div>
        <div className="p-1.5 rounded bg-[#0E131A] border border-[#1F2630]">
          <div className="text-[10px] text-zinc-500 font-mono">Recall</div>
          <div className="text-xs font-mono font-bold text-teal-400">{(model.recall * 100).toFixed(1)}%</div>
        </div>
        <div className="p-1.5 rounded bg-[#0E131A] border border-[#1F2630]">
          <div className="text-[10px] text-zinc-500 font-mono">F1 Score</div>
          <div className="text-xs font-mono font-bold text-emerald-400">{(model.f1Score * 100).toFixed(1)}%</div>
        </div>
        <div className="p-1.5 rounded bg-[#0E131A] border border-[#1F2630]">
          <div className="text-[10px] text-zinc-500 font-mono">ROC-AUC</div>
          <div className="text-xs font-mono font-bold text-teal-400">{model.rocAuc.toFixed(3)}</div>
        </div>
      </div>

      {/* Top Features */}
      <div className="pt-2 border-t border-[#1F2630]/80">
        <div className="text-[10px] font-mono text-zinc-500 mb-1">Top Supervised Features:</div>
        <div className="flex flex-wrap gap-1">
          {model.topFeatures.slice(0, 3).map((feat, i) => (
            <span
              key={i}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#161D26] border border-[#1F2630] text-zinc-400"
            >
              {feat.feature} ({Math.round(feat.importance * 100)}%)
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export const ProviderHealthPanel: React.FC = () => {
  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Wifi className="w-4 h-4 text-emerald-400" />
          <div>
            <h3 className="text-xs font-semibold text-zinc-200">Provider Health & Latency</h3>
            <p className="text-[11px] text-zinc-500">External security and blockchain nodes</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>All Systems Go</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-1">
        {DEMO_PROVIDER_HEALTH.map((p, idx) => (
          <div
            key={idx}
            className="p-1.5 rounded bg-[#0E131A] border border-[#1F2630] flex items-center justify-between text-[11px]"
          >
            <div className="truncate pr-1">
              <span className="font-medium text-zinc-300 block truncate">{p.name.split(' ')[0]}</span>
              <span className="text-[10px] text-zinc-500 font-mono truncate">{p.endpoint}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-emerald-400 text-[10px]">{p.latencyMs}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
