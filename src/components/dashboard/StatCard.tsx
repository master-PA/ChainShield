import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  sublabel?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  deltaType = 'positive',
  icon: Icon,
  sublabel,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between transition-colors ${
        onClick ? 'cursor-pointer hover:border-zinc-700' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-400 font-medium">{label}</span>
        <div className="w-7 h-7 rounded bg-[#161D26] border border-[#1F2630] flex items-center justify-center text-teal-400">
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="mt-3">
        <div className="text-xl font-mono font-bold text-zinc-100">{value}</div>
        <div className="mt-1 flex items-center space-x-2 text-[11px]">
          {delta && (
            <span
              className={`font-mono font-medium ${
                deltaType === 'negative'
                  ? 'text-rose-400'
                  : deltaType === 'positive'
                    ? 'text-emerald-400'
                    : 'text-zinc-400'
              }`}
            >
              {delta}
            </span>
          )}
          {sublabel && <span className="text-zinc-500">{sublabel}</span>}
        </div>
      </div>
    </div>
  );
};
