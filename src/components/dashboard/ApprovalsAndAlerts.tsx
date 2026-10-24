import React from 'react';
import { AlertTriangle, ShieldCheck, ArrowRight, CheckCircle2, BellRing, ExternalLink } from 'lucide-react';
import { StatusBadge } from '../layout/StatusBadge';
import { useSecurity } from '../../context/SecurityContext';
import { shortenAddress, formatTimeAgo } from '../../lib/formatters';

interface ApprovalsAndAlertsProps {
  navigate: (route: string) => void;
}

export const ApprovalsAtRiskPanel: React.FC<ApprovalsAndAlertsProps> = ({ navigate }) => {
  const { walletHealth } = useSecurity();
  const highRiskApprovals = walletHealth.approvals.filter((a) => a.riskScore >= 40);

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold text-zinc-200">Approvals At Risk</h3>
          <p className="text-[11px] text-zinc-500">
            For watched wallet {shortenAddress(walletHealth.walletAddress, 4, 4)}
          </p>
        </div>
        <button
          onClick={() => navigate('/wallet-health')}
          className="text-[11px] font-mono text-teal-400 hover:underline flex items-center gap-1"
        >
          <span>Audit All</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-2">
        {highRiskApprovals.map((appr) => (
          <div
            key={appr.id}
            className="p-2.5 rounded bg-[#0E131A] border border-[#1F2630] flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-medium text-zinc-200 flex items-center gap-1.5">
                <span>{appr.tokenSymbol}</span>
                <span className="text-[10px] text-zinc-400">({appr.tokenType})</span>
                {appr.hasProxyUpgrade && (
                  <span className="text-[9px] font-mono px-1 bg-rose-950 text-rose-300 rounded border border-rose-800">
                    Proxy Upgraded
                  </span>
                )}
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                Spender: {appr.spenderLabel} ({shortenAddress(appr.spenderAddress, 4, 3)})
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <StatusBadge level={appr.riskLevel} score={appr.riskScore} size="sm" />
              <button
                onClick={() => navigate('/wallet-health')}
                className="px-2 py-0.5 text-[10px] font-mono rounded bg-rose-950/60 text-rose-300 border border-rose-800/80 hover:bg-rose-900"
              >
                Revoke
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const UpgradeTripwirePanel: React.FC<ApprovalsAndAlertsProps> = ({ navigate }) => {
  const { tripwireAlerts } = useSecurity();

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BellRing className="w-4 h-4 text-rose-400" />
          <div>
            <h3 className="text-xs font-semibold text-zinc-200">Upgrade Tripwire Alerts</h3>
            <p className="text-[11px] text-zinc-500">EIP-1967 proxy storage change monitor</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/alerts')}
          className="text-[11px] font-mono text-teal-400 hover:underline"
        >
          View Alerts ({tripwireAlerts.length}) →
        </button>
      </div>

      <div className="space-y-2">
        {tripwireAlerts.map((alert) => (
          <div
            key={alert.id}
            className="p-2.5 rounded bg-[#0E131A] border border-rose-900/40 flex flex-col space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-300">{alert.title}</span>
              <span className="text-[10px] font-mono text-zinc-500">
                {formatTimeAgo(alert.timestamp)}
              </span>
            </div>
            <div className="text-[11px] text-zinc-400">
              Spender <span className="font-mono text-zinc-300">{alert.spenderName}</span> changed
              implementation to unverified bytecode.
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-zinc-500">
                Old: {shortenAddress(alert.oldImplementation, 4, 3)} → New:{' '}
                {shortenAddress(alert.newImplementation, 4, 3)}
              </span>
              <button
                onClick={() => navigate('/wallet-health')}
                className="text-[11px] font-mono text-rose-400 hover:underline font-semibold"
              >
                Revoke Approval Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const RecentScansTable: React.FC<{
  onSelectTarget: (target: string) => void;
  navigate: (route: string) => void;
}> = ({ onSelectTarget, navigate }) => {
  const { allScans } = useSecurity();

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630]">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-xs font-semibold text-zinc-200">Recent Scans</h3>
          <p className="text-[11px] text-zinc-500">Audited targets & Sepolia evidence anchors</p>
        </div>
        <button
          onClick={() => navigate('/history')}
          className="text-[11px] font-mono text-teal-400 hover:underline"
        >
          View Full History →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#1F2630] text-zinc-500 font-mono text-[11px]">
              <th className="pb-2 font-normal">TARGET / DOMAIN</th>
              <th className="pb-2 font-normal">RISK SCORE</th>
              <th className="pb-2 font-normal">LINK SOURCE</th>
              <th className="pb-2 font-normal">SEPOLIA ANCHOR</th>
              <th className="pb-2 font-normal">TIME</th>
              <th className="pb-2 font-normal text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1F2630]/60">
            {allScans.slice(0, 5).map((scan) => (
              <tr key={scan.id} className="hover:bg-[#161D26]/60 transition-colors">
                <td className="py-2.5 font-mono text-zinc-200 truncate max-w-[200px]">
                  {scan.target}
                </td>
                <td className="py-2.5">
                  <StatusBadge level={scan.riskLevel} score={scan.riskScore} size="sm" />
                </td>
                <td className="py-2.5 font-mono text-zinc-400 text-[11px] uppercase">
                  {scan.linkSource.replace('_', ' ')}
                </td>
                <td className="py-2.5 font-mono text-zinc-400">
                  {scan.evidence?.isAnchored ? (
                    <span className="inline-flex items-center space-x-1 text-teal-400 text-[11px]">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{scan.evidence.canonicalHash.slice(0, 8)}...</span>
                    </span>
                  ) : (
                    <span className="text-zinc-500 text-[11px]">Local Hash</span>
                  )}
                </td>
                <td className="py-2.5 text-zinc-500 font-mono text-[11px]">
                  {formatTimeAgo(scan.createdAt)}
                </td>
                <td className="py-2.5 text-right">
                  <button
                    onClick={() => {
                      onSelectTarget(scan.target);
                      navigate(`/scanner?target=${encodeURIComponent(scan.target)}`);
                    }}
                    className="text-teal-400 hover:underline text-[11px] font-mono"
                  >
                    Inspect
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
