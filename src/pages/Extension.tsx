import React, { useState } from 'react';
import {
  Puzzle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Code2,
  Lock,
} from 'lucide-react';
import { StatusBadge } from '../components/layout/StatusBadge';

export const Extension: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  const [showInterceptModal, setShowInterceptModal] = useState(false);
  const [interceptStatus, setInterceptStatus] = useState<'idle' | 'blocked' | 'proceeded'>('idle');

  const handleSimulatedDappClick = () => {
    setShowInterceptModal(true);
    setInterceptStatus('idle');
  };

  const handleBlockAction = () => {
    setShowInterceptModal(false);
    setInterceptStatus('blocked');
  };

  const handleProceedAction = () => {
    setShowInterceptModal(false);
    setInterceptStatus('proceeded');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Chrome Extension (Manifest V3)</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Interception layer wrapping window.ethereum to evaluate risks before your wallet prompt appears
          </p>
        </div>
      </div>

      {/* Interactive Simulator Section */}
      <div className="p-5 rounded-lg bg-[#11161D] border border-teal-800/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
            <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider font-mono">
              LIVE PRE-SIGN INTERCEPTION SIMULATOR
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">Target: mintzone-nft.xyz</span>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Test how the extension intercepts a malicious dApp button click. Notice that Sentinel's pre-sign
          security modal renders in a shadow DOM <strong className="text-zinc-100">before</strong> any
          MetaMask or wallet popup can be triggered.
        </p>

        {/* Mock dApp Window */}
        <div className="p-6 rounded-lg bg-[#0E131A] border border-[#1F2630] flex flex-col items-center justify-center space-y-4">
          <div className="w-full flex items-center justify-between border-b border-[#1F2630] pb-2 text-xs font-mono text-zinc-500">
            <span>MINTZONE EXCLUSIVE AIRDROP</span>
            <span className="text-rose-400">Suspicious Page</span>
          </div>

          <div className="text-center py-4 space-y-2">
            <h3 className="text-lg font-bold text-zinc-100">Claim Free Genesis NFT</h3>
            <p className="text-xs text-zinc-400 max-w-sm">
              Connect your Web3 wallet and click below to claim your free whitelist NFT.
            </p>
            <button
              onClick={handleSimulatedDappClick}
              className="mt-3 px-6 py-2.5 rounded-md bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-bold text-xs uppercase tracking-wider shadow-lg transition-transform active:scale-95"
            >
              Claim Free NFT (Simulate User Click)
            </button>
          </div>

          {interceptStatus === 'blocked' && (
            <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>REQUEST BLOCKED SAFELY. Transaction was dropped before reaching your wallet.</span>
            </div>
          )}
          {interceptStatus === 'proceeded' && (
            <div className="p-3 rounded bg-amber-950/40 border border-amber-800 text-amber-300 text-xs font-mono flex items-center space-x-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>WARNING: You manually bypassed the Sentinel pre-sign shield.</span>
            </div>
          )}
        </div>
      </div>

      {/* Sentinel Pre-Sign Overlay Modal */}
      {showInterceptModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-[#11161D] border border-rose-800/80 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1F2630] pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-zinc-100 font-mono">
                  CHAINSHIELD PRE-SIGN INTERCEPT
                </h3>
              </div>
              <StatusBadge level="CRITICAL" score={91} size="sm" />
            </div>

            <div className="p-3 rounded bg-rose-950/40 border border-rose-900/60 text-xs text-rose-200">
              <div className="font-bold uppercase tracking-wider font-mono">
                RECOMMENDATION: AVOID (CONFIRMED DRAINER)
              </div>
              <p className="mt-1 leading-relaxed text-zinc-300">
                The webpage button claims to "Claim Free NFT", but the actual calldata executes{' '}
                <code className="text-rose-400 font-bold">setApprovalForAll(all NFTs, true)</code>.
              </p>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-[#0E131A] border border-[#1F2630]">
                <span className="text-zinc-500">Target Host</span>
                <span className="text-zinc-300">mintzone-nft.xyz (2d old)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0E131A] border border-[#1F2630]">
                <span className="text-zinc-500">Drainer Kit</span>
                <span className="text-rose-400 font-bold">Inferno Drainer (87% Match)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0E131A] border border-[#1F2630]">
                <span className="text-zinc-500">Intent Mismatch</span>
                <span className="text-rose-400 font-bold">96 / 100</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleBlockAction}
                className="flex-1 py-2 rounded text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors uppercase tracking-wider"
              >
                Avoid & Block Request
              </button>
              <button
                onClick={handleProceedAction}
                className="px-3 py-2 rounded text-xs font-mono bg-[#161D26] text-zinc-400 hover:text-zinc-200 border border-[#1F2630]"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manifest V3 Specification */}
      <div className="p-5 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-3">
        <h3 className="text-xs font-semibold text-zinc-200">Extension Architecture (MV3)</h3>
        <p className="text-xs text-zinc-400 leading-relaxed">
          The extension operates via a content script injection that proxies <code className="text-teal-400">window.ethereum.request</code>.
          Before forwarding RPC requests to the user's real wallet provider, it queries the local /api/scans
          endpoint or privacy prefix check.
        </p>

        <div className="p-3 rounded bg-[#0E131A] border border-[#1F2630] font-mono text-xs text-zinc-300 space-y-1">
          <div>"manifest_version": 3,</div>
          <div>"name": "ChainShield Sentinel Pre-Sign Security",</div>
          <div>"permissions": ["storage", "activeTab"],</div>
          <div>"host_permissions": ["http://*/*", "https://*/*"]</div>
        </div>
      </div>
    </div>
  );
};
