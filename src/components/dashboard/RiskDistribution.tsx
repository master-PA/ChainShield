import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

export const RiskDistribution: React.FC = () => {
  const distribution = [
    { label: 'LOW RISK (0-24)', count: 4210, pct: 54, color: 'bg-emerald-500', text: 'text-emerald-400' },
    { label: 'CAUTION (25-49)', count: 1820, pct: 23, color: 'bg-amber-500', text: 'text-amber-400' },
    { label: 'HIGH RISK (50-74)', count: 940, pct: 12, color: 'bg-orange-500', text: 'text-orange-400' },
    { label: 'CRITICAL (75-100)', count: 860, pct: 11, color: 'bg-rose-500', text: 'text-rose-400' },
  ];

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold text-zinc-200">Risk Level Distribution</h3>
          <p className="text-[11px] text-zinc-500">7,830 targets analyzed past 30 days</p>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161D26] text-zinc-400 border border-[#1F2630]">
          30D Aggregate
        </span>
      </div>

      {/* Multi-segment stacked progress bar */}
      <div className="w-full h-3 rounded-full bg-[#161D26] overflow-hidden flex my-2 border border-[#1F2630]">
        {distribution.map((d, i) => (
          <div key={i} style={{ width: `${d.pct}%` }} className={`${d.color} h-full`} />
        ))}
      </div>

      {/* Breakdown labels */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {distribution.map((d, i) => (
          <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded bg-[#0E131A] border border-[#1F2630]/60">
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${d.color}`} />
              <span className="text-[11px] text-zinc-400">{d.label.split(' ')[0]}</span>
            </div>
            <span className={`font-mono font-medium ${d.text}`}>{d.count} ({d.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ScanTrend: React.FC = () => {
  // 14 points showing daily volume
  const dataPoints = [120, 145, 180, 160, 210, 240, 205, 270, 310, 290, 340, 320, 380, 415];
  const max = Math.max(...dataPoints);

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-xs font-semibold text-zinc-200">Scan Activity Trend</h3>
          <p className="text-[11px] text-zinc-500">Pre-transaction scans per day</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono font-bold text-teal-400">415 scans/day</div>
          <div className="text-[10px] text-emerald-400 font-mono">+18.4% vs last week</div>
        </div>
      </div>

      {/* Bar sparkline */}
      <div className="h-20 flex items-end gap-1.5 pt-4">
        {dataPoints.map((val, idx) => {
          const heightPct = Math.round((val / max) * 100);
          return (
            <div key={idx} className="flex-1 flex flex-col items-center group relative">
              <div
                style={{ height: `${heightPct}%` }}
                className={`w-full rounded-t-sm transition-all duration-300 ${
                  idx === dataPoints.length - 1 ? 'bg-teal-400' : 'bg-[#1C2634] hover:bg-teal-500/70'
                }`}
              />
              {/* Tooltip on hover */}
              <div className="absolute -top-6 hidden group-hover:block bg-[#161D26] text-[10px] font-mono px-1 py-0.5 rounded border border-[#1F2630] z-10 whitespace-nowrap text-zinc-200">
                {val} scans
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 pt-2 border-t border-[#1F2630] mt-2">
        <span>14 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
};
