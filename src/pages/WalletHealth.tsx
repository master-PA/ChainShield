import React, { useState } from 'react';
import {
  Activity,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  Search,
} from 'lucide-react';
import { StatusBadge } from '../components/layout/StatusBadge';
import { useSecurity } from '../context/SecurityContext';
import { shortenAddress } from '../lib/formatters';

export const WalletHealth: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  const { walletHealth, revokeApproval, isDemoDataset } = useSecurity();
  const [walletInput, setWalletInput] = useState(walletHealth.walletAddress);
  const [revokeModalItem, setRevokeModalItem] = useState<(typeof walletHealth.approvals)[0] | null>(
    null
  );
  const [copiedRevoke, setCopiedRevoke] = useState(false);

  const getHealthColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400';
    if (score >= 45) return 'text-amber-400';
    return 'text-rose-400';
  };

  const handleCopyRevokeCalldata = (item: (typeof walletHealth.approvals)[0]) => {
    // approve(spender, 0) => 0x095ea7b3 + 32-byte spender + 32-byte 0
    const cleanSpender = item.spenderAddress.replace(/^0x/i, '').padStart(64, '0').toLowerCase();
    const zeroAmount = ''.padStart(64, '0');
    const calldata = '0x095ea7b3' + cleanSpender + zeroAmount;
    navigator.clipboard.writeText(calldata);
    setCopiedRevoke(true);
    setTimeout(() => setCopiedRevoke(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-zinc-100">Wallet Health Audit & Revoke</h1>
            {isDemoDataset && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                Demo dataset
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Read-only evaluation of existing token allowances, unverified spenders, and proxy upgrades
          </p>
        </div>

        {/* Address Search */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              placeholder="Enter public address 0x..."
              className="bg-[#161D26] border border-[#1F2630] rounded-md pl-8 pr-3 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-teal-500 w-64"
            />
          </div>
        </div>
      </div>

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
          <span className="text-xs text-zinc-400">Wallet Health Score</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-3xl font-mono font-bold ${getHealthColor(walletHealth.overallScore)}`}>
              {walletHealth.overallScore}
            </span>
            <span className="text-xs font-mono text-zinc-500">/ 100</span>
          </div>
          <span className="text-[10px] font-mono uppercase text-zinc-400 mt-1">
            Status: {walletHealth.healthStatus.replace('_', ' ')}
          </span>
        </div>

        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
          <span className="text-xs text-zinc-400">Active Approvals</span>
          <div className="text-2xl font-mono font-bold text-zinc-100 mt-2">
            {walletHealth.totalApprovals}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Tokens & NFT collections</span>
        </div>

        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
          <span className="text-xs text-zinc-400">Unlimited Approvals</span>
          <div className="text-2xl font-mono font-bold text-rose-400 mt-2">
            {walletHealth.unlimitedApprovals}
          </div>
          <span className="text-[10px] text-rose-400/80 mt-1 font-mono">Maximum exposure</span>
        </div>

        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between">
          <span className="text-xs text-zinc-400">Unverified Spenders</span>
          <div className="text-2xl font-mono font-bold text-orange-400 mt-2">
            {walletHealth.unverifiedSpenders}
          </div>
          <span className="text-[10px] text-zinc-500 mt-1">Missing source code</span>
        </div>
      </div>

      {/* Approvals Table */}
      <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-zinc-200">Active Allowances & Permissions</h2>
          <span className="text-xs font-mono text-zinc-500">
            Address: {shortenAddress(walletHealth.walletAddress, 6, 6)}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#1F2630] text-zinc-500 font-mono text-[11px]">
                <th className="pb-2 font-normal">ASSET</th>
                <th className="pb-2 font-normal">SPENDER CONTRACT</th>
                <th className="pb-2 font-normal">ALLOWANCE</th>
                <th className="pb-2 font-normal">RISK LEVEL</th>
                <th className="pb-2 font-normal">APPROVAL DATE</th>
                <th className="pb-2 font-normal text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2630]/60">
              {walletHealth.approvals.map((appr) => (
                <tr key={appr.id} className="hover:bg-[#161D26]/60 transition-colors">
                  <td className="py-3">
                    <div className="font-semibold text-zinc-200">{appr.tokenSymbol}</div>
                    <div className="text-[10px] text-zinc-500">{appr.tokenName} ({appr.tokenType})</div>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-mono text-zinc-300">{appr.spenderLabel}</span>
                      {appr.hasProxyUpgrade && (
                        <span className="px-1 py-0.2 text-[9px] font-mono bg-rose-950 text-rose-300 rounded border border-rose-800">
                          Proxy Upgraded
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      {shortenAddress(appr.spenderAddress, 6, 4)}
                    </div>
                  </td>
                  <td className="py-3 font-mono">
                    <span className={appr.isUnlimited ? 'text-rose-400 font-semibold' : 'text-zinc-300'}>
                      {appr.approvedAmount}
                    </span>
                  </td>
                  <td className="py-3">
                    <StatusBadge level={appr.riskLevel} score={appr.riskScore} size="sm" />
                  </td>
                  <td className="py-3 text-zinc-500 font-mono text-[11px]">{appr.approvalDate}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setRevokeModalItem(appr)}
                      className="px-2.5 py-1 text-xs font-mono rounded bg-rose-950/60 text-rose-300 border border-rose-800/80 hover:bg-rose-900 transition-colors"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoke Builder Modal */}
      {revokeModalItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#11161D] border border-[#1F2630] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F2630] pb-3">
              <h3 className="text-sm font-semibold text-zinc-100">
                Revoke Allowance: {revokeModalItem.tokenSymbol}
              </h3>
              <button
                onClick={() => setRevokeModalItem(null)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              This action sets the approved allowance to <code className="text-emerald-400">0</code> for spender{' '}
              <strong className="text-zinc-200">{revokeModalItem.spenderLabel}</strong> (
              {shortenAddress(revokeModalItem.spenderAddress, 4, 4)}).
            </p>

            <div className="p-3 rounded bg-[#0E131A] border border-[#1F2630] space-y-1">
              <span className="text-[10px] font-mono text-zinc-500 block uppercase">
                Generated Zero-Allowance Calldata (approve(spender, 0))
              </span>
              <div className="text-[11px] font-mono text-zinc-200 break-all">
                0x095ea7b3
                {revokeModalItem.spenderAddress.replace(/^0x/i, '').padStart(64, '0').toLowerCase()}
                {''.padStart(64, '0')}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleCopyRevokeCalldata(revokeModalItem)}
                className="flex-1 py-2 rounded text-xs font-mono bg-[#161D26] text-zinc-200 border border-[#1F2630] hover:border-zinc-600 transition-colors flex items-center justify-center space-x-1.5"
              >
                {copiedRevoke ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedRevoke ? 'Copied Calldata' : 'Copy Calldata'}</span>
              </button>
              <button
                onClick={() => {
                  revokeApproval(revokeModalItem.id);
                  setRevokeModalItem(null);
                }}
                className="flex-1 py-2 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                Simulate Revoke On-Chain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
