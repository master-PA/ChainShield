import React from 'react';
import { RiskLevel } from '../../types/security';
import { getRiskColorClass } from '../../lib/formatters';

interface StatusBadgeProps {
  level: RiskLevel;
  score?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ level, score, size = 'md' }) => {
  const colors = getRiskColorClass(level);

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm font-semibold',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-mono font-medium border ${colors.bg} ${colors.text} ${colors.border} ${sizeClasses[size]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      <span>{level}</span>
      {score !== undefined && <span className="opacity-70 font-mono text-[90%]">({score})</span>}
    </span>
  );
};
