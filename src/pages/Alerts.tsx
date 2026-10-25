import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Mail,
  Send,
  Plus,
  Trash2,
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { shortenAddress, formatTimeAgo } from '../lib/formatters';

export const Alerts: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  const { tripwireAlerts, poisoningAlerts, isDemoDataset, loadPriyaAlert } = useSecurity();
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [telegramAlerts, setTelegramAlerts] = useState(false);
  const [telegramBotHandle, setTelegramBotHandle] = useState('@ChainShieldAlertBot');
  const [newWatchAddress, setNewWatchAddress] = useState('');
  const [watchedAddresses, setWatchedAddresses] = useState<string[]>([
    '0x32A890184c718b91823901b8a91083918a90182c',
    '0x89410283c01829038b192837bc8192a01948',
  ]);

  const handleAddAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (newWatchAddress.trim() && !watchedAddresses.includes(newWatchAddress.trim())) {
      setWatchedAddresses([...watchedAddresses, newWatchAddress.trim()]);
      setNewWatchAddress('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-zinc-100">Live Security Alerts & Tripwires</h1>
            {isDemoDataset && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                Demo dataset
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time proxy implementation upgrades, vanity address poisoning, and wallet notifications
          </p>
        </div>
      </div>

      {/* Row: Active Tripwire Alerts */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
          <BellRing className="w-4 h-4 text-rose-400" />
          <span>Active Upgrade Tripwires ({tripwireAlerts.length})</span>
        </h2>

        {tripwireAlerts.map((alert) => (
          <div
            key={alert.id}
            className="p-4 rounded-lg bg-[#11161D] border border-rose-900/60 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-sm font-semibold text-rose-300">{alert.title}</span>
                <div className="text-xs text-zinc-400 mt-0.5 font-mono">
                  Watched Wallet: {shortenAddress(alert.walletAddress, 6, 6)} • Spender:{' '}
                  {alert.spenderName}
                </div>
              </div>
              <span className="text-xs font-mono text-zinc-500">{formatTimeAgo(alert.timestamp)}</span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed bg-[#0E131A] p-3 rounded border border-[#1F2630]">
              {alert.recommendation}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-[#161D26] border border-[#1F2630]">
                <span className="text-[10px] text-zinc-500 block">OLD IMPLEMENTATION</span>
                <span className="text-zinc-300 truncate block">{alert.oldImplementation}</span>
              </div>
              <div className="p-2 rounded bg-rose-950/30 border border-rose-900/60">
                <span className="text-[10px] text-rose-400 block font-semibold">
                  NEW UNVERIFIED IMPLEMENTATION (EIP-1967)
                </span>
                <span className="text-rose-300 truncate block">{alert.newImplementation}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => navigate('/wallet-health')}
                className="px-3 py-1.5 rounded text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors"
              >
                Revoke Spender Approval in Wallet Health →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Row: Address Poisoning Alerts */}
      <div className="space-y-3 pt-2">
        <h2 className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          <span>Address Poisoning Anomalies ({poisoningAlerts.length})</span>
        </h2>

        {poisoningAlerts.map((alert) => (
          <div
            key={alert.id}
            className="p-4 rounded-lg bg-[#11161D] border border-orange-900/40 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-orange-300">
                Vanity Lookalike Counterparty Detected
              </span>
              <span className="text-xs font-mono text-zinc-500">{formatTimeAgo(alert.timestamp)}</span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">{alert.details}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-[#0E131A] border border-[#1F2630]">
                <span className="text-[10px] text-zinc-500 block uppercase">
                  LEGITIMATE FREQUENT RECIPIENT
                </span>
                <span className="text-emerald-400 font-semibold block mt-1 break-all">
                  {alert.legitimateAddress}
                </span>
              </div>
              <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/50">
                <span className="text-[10px] text-rose-400 block uppercase font-semibold">
                  POISONED ATTACKER ADDRESS (Same prefix/suffix)
                </span>
                <span className="text-rose-300 font-semibold block mt-1 break-all">
                  {alert.suspectAddress}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configuration & Watchlist Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Notification Channels */}
        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-3">
          <h3 className="text-xs font-semibold text-zinc-200">Alert Dispatch Channels</h3>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-[#0E131A] border border-[#1F2630]">
              <span className="text-zinc-300">In-App Live Status & Audio Alarm</span>
              <input
                type="checkbox"
                checked={inAppAlerts}
                onChange={(e) => setInAppAlerts(e.target.checked)}
                className="rounded bg-[#161D26] border-[#1F2630] text-teal-500 focus:ring-0"
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[#0E131A] border border-[#1F2630]">
              <span className="text-zinc-300">Email Notification (SMTP)</span>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="rounded bg-[#161D26] border-[#1F2630] text-teal-500 focus:ring-0"
              />
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[#0E131A] border border-[#1F2630]">
              <span className="text-zinc-300">Telegram Bot Webhook (@ChainShieldBot)</span>
              <input
                type="checkbox"
                checked={telegramAlerts}
                onChange={(e) => setTelegramAlerts(e.target.checked)}
                className="rounded bg-[#161D26] border-[#1F2630] text-teal-500 focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Watched Wallets */}
        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-3">
          <h3 className="text-xs font-semibold text-zinc-200">Watched Wallet Addresses</h3>
          <form onSubmit={handleAddAddress} className="flex gap-2">
            <input
              type="text"
              value={newWatchAddress}
              onChange={(e) => setNewWatchAddress(e.target.value)}
              placeholder="Add address 0x..."
              className="flex-1 bg-[#161D26] border border-[#1F2630] rounded-md px-2.5 py-1.5 text-xs font-mono text-zinc-200 focus:outline-none focus:border-teal-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs shrink-0"
            >
              Add
            </button>
          </form>

          <div className="space-y-1.5">
            {watchedAddresses.map((addr) => (
              <div
                key={addr}
                className="p-2 rounded bg-[#0E131A] border border-[#1F2630] flex items-center justify-between text-xs font-mono text-zinc-300"
              >
                <span>{shortenAddress(addr, 8, 6)}</span>
                <span className="text-[10px] text-teal-400 font-sans">Monitoring active</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
