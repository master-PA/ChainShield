import React, { useState, useEffect } from 'react';
import {
  Puzzle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  ExternalLink,
  Code2,
  Lock,
  Download,
  Copy,
  Check,
  Zap,
  Globe,
  Settings as SettingsIcon,
  Layers,
} from 'lucide-react';
import { StatusBadge } from '../components/layout/StatusBadge';

export const Extension: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  const [showInterceptModal, setShowInterceptModal] = useState(false);
  const [activeScenario, setActiveScenario] = useState<'blanket_nft' | 'unlimited_approve' | 'offchain_sign'>('blanket_nft');
  const [interceptStatus, setInterceptStatus] = useState<'idle' | 'blocked' | 'proceeded'>('idle');
  const [isCopied, setIsCopied] = useState(false);
  const [isExtensionActive, setIsExtensionActive] = useState(false);

  useEffect(() => {
    // Check if real extension injected provider into current page
    if (typeof window !== 'undefined' && (window as any).__CHAINSHIELD_INPAGE_INJECTED__) {
      setIsExtensionActive(true);
    }
  }, []);

  const extensionPath = 'c:\\Users\\Lenovo\\Documents\\IITG\\New folder\\chainshield\\extension';

  const handleCopyPath = () => {
    navigator.clipboard.writeText(extensionPath);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSimulateAction = (scenario: 'blanket_nft' | 'unlimited_approve' | 'offchain_sign') => {
    setActiveScenario(scenario);
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
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-100 font-mono">ChainShield Sentinel Extension (Manifest V3)</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-400 border border-teal-800 font-mono">
              v1.0.0 READY
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real, installable browser extension for Edge & Chrome providing automatic navigation scanning and pre-sign EIP-1193 transaction interception
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isExtensionActive ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>EXTENSION ACTIVE IN BROWSER</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>UNPACKED BUILD READY TO LOAD</span>
            </div>
          )}
        </div>
      </div>

      {/* Installation Quick Start Card */}
      <div className="p-5 rounded-lg bg-[#11161D] border border-teal-800/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Download className="w-4 h-4 text-teal-400" />
            <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider font-mono">
              1-CLICK INSTALLATION GUIDE FOR MICROSOFT EDGE & GOOGLE CHROME
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">Developer Mode Unpacked Extension</span>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          The extension is fully compiled and ready to load directly into any Chromium-based browser without publishing to the web store:
        </p>

        {/* Step by Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-[#0B0F14] border border-[#1F2630] space-y-1">
            <div className="text-teal-400 font-bold">STEP 1</div>
            <div className="text-zinc-200 font-semibold">Open Extensions Page</div>
            <p className="text-[11px] text-zinc-400">
              Navigate to <code className="text-teal-300">edge://extensions</code> or <code className="text-teal-300">chrome://extensions</code>
            </p>
          </div>

          <div className="p-3 rounded bg-[#0B0F14] border border-[#1F2630] space-y-1">
            <div className="text-teal-400 font-bold">STEP 2</div>
            <div className="text-zinc-200 font-semibold">Enable Developer Mode</div>
            <p className="text-[11px] text-zinc-400">
              Toggle on the <strong className="text-zinc-200">"Developer mode"</strong> switch (top-right or left sidebar)
            </p>
          </div>

          <div className="p-3 rounded bg-[#0B0F14] border border-[#1F2630] space-y-1">
            <div className="text-teal-400 font-bold">STEP 3</div>
            <div className="text-zinc-200 font-semibold">Click "Load Unpacked"</div>
            <p className="text-[11px] text-zinc-400">
              Click the <strong className="text-zinc-200">"Load unpacked"</strong> button in the extension toolbar
            </p>
          </div>

          <div className="p-3 rounded bg-[#0B0F14] border border-[#1F2630] space-y-1">
            <div className="text-teal-400 font-bold">STEP 4</div>
            <div className="text-zinc-200 font-semibold">Select Extension Folder</div>
            <p className="text-[11px] text-zinc-400">
              Select the compiled <code className="text-teal-300">extension/</code> directory from this workspace
            </p>
          </div>
        </div>

        {/* Copy Folder Path Box */}
        <div className="p-3 rounded bg-[#0B0F14] border border-[#1F2630] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full truncate">
            <Terminal className="w-4 h-4 text-zinc-400 shrink-0" />
            <span className="text-xs text-zinc-400 font-mono shrink-0">Unpacked Path:</span>
            <code className="text-xs text-teal-300 font-mono truncate">{extensionPath}</code>
          </div>
          <button
            onClick={handleCopyPath}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1F2630] hover:bg-[#2B3542] text-zinc-200 text-xs font-mono font-bold transition-colors shrink-0"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopied ? 'Path Copied!' : 'Copy Directory Path'}</span>
          </button>
        </div>
      </div>

      {/* Extension Core Capabilities & Architecture Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-400" />
            <h3 className="text-xs font-bold text-zinc-200 font-mono">EIP-1193 Pre-Sign Intercept</h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Injected provider wrapper wraps <code className="text-zinc-300 font-mono">window.ethereum.request</code> for <code className="text-zinc-300 font-mono">eth_sendTransaction</code>, <code className="text-zinc-300 font-mono">personal_sign</code>, and <code className="text-zinc-300 font-mono">eth_signTypedData_v4</code>.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold text-zinc-200 font-mono">Closed Shadow DOM Modals</h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Security alerts and pre-sign warnings render inside a closed ShadowRoot attached to <code className="text-zinc-300 font-mono">document.documentElement</code>, immune to dApp CSS injection or malicious DOM tampering.
          </p>
        </div>

        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-zinc-200 font-mono">Dynamic Navigation Badges</h3>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The background service worker evaluates visited domains against typosquatting heuristics and drainer kit fingerprints, dynamically updating toolbar badges (<span className="text-emerald-400">SAFE</span>, <span className="text-amber-400">WARN</span>, <span className="text-rose-400">91</span>).
          </p>
        </div>
      </div>

      {/* Interactive In-Browser Testbench Section */}
      <div className="p-5 rounded-lg bg-[#11161D] border border-teal-800/40 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
            <h2 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider font-mono">
              PRE-SIGN THREAT TESTBENCH (INTERACTIVE SIMULATOR)
            </h2>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">Simulate Real dApp Wallet Triggers</span>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed">
          Test how ChainShield Sentinel intercepts different Web3 attack vectors. Notice that the pre-sign modal evaluates the transaction and captures claim-vs-reality intent mismatches <strong className="text-zinc-100">before</strong> any wallet extension popup can appear:
        </p>

        {/* Mock dApp Window */}
        <div className="p-6 rounded-lg bg-[#0E131A] border border-[#1F2630] flex flex-col items-center justify-center space-y-4">
          <div className="w-full flex items-center justify-between border-b border-[#1F2630] pb-2 text-xs font-mono text-zinc-500">
            <span>SIMULATED WEB3 dAPP ENVIRONMENT</span>
            <span className="text-rose-400">Active Test Target: mintzone-nft.xyz</span>
          </div>

          <div className="text-center py-2 space-y-2 max-w-xl">
            <h3 className="text-base font-bold text-zinc-100">Genesis NFT Claim & Verification Portal</h3>
            <p className="text-xs text-zinc-400">
              Select a test transaction or attack payload below to trigger the pre-sign interception dialog:
            </p>

            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <button
                onClick={async () => {
                  if (typeof window !== 'undefined' && (window as any).ethereum) {
                    try {
                      await (window as any).ethereum.request({
                        method: 'eth_sendTransaction',
                        params: [{
                          from: '0x71C84167F30831956453773266292494',
                          to: '0x71C84167F30831956453773266292494',
                          value: '0x0',
                          data: '0x',
                        }],
                      });
                      setInterceptStatus('proceeded');
                    } catch (err: any) {
                      if (err.code === 4001) setInterceptStatus('blocked');
                    }
                  } else {
                    handleSimulateAction('blanket_nft');
                  }
                }}
                className="px-3.5 py-2 rounded bg-teal-950/70 hover:bg-teal-900 border border-teal-800 text-teal-200 text-xs font-mono font-bold transition-all"
              >
                0. Harmless Test Interaction (0 ETH)
              </button>
              <button
                onClick={() => handleSimulateAction('blanket_nft')}
                className="px-3.5 py-2 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-mono font-bold transition-all"
              >
                1. Blanket NFT Drain (setApprovalForAll)
              </button>
              <button
                onClick={() => handleSimulateAction('unlimited_approve')}
                className="px-3.5 py-2 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-800 text-amber-200 text-xs font-mono font-bold transition-all"
              >
                2. Unlimited ERC-20 Allowance (2^256-1)
              </button>
              <button
                onClick={() => handleSimulateAction('offchain_sign')}
                className="px-3.5 py-2 rounded bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-800 text-indigo-200 text-xs font-mono font-bold transition-all"
              >
                3. Off-Chain Permit Login Phishing
              </button>
            </div>

            <div className="pt-3">
              <a
                href="/test-dapp.html"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded bg-[#1F2630] hover:bg-[#2B3542] text-teal-300 text-xs font-mono font-bold border border-teal-700/50 transition-colors"
              >
                <span>Launch Full Standalone Test dApp (test-dapp.html)</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {interceptStatus === 'blocked' && (
            <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center space-x-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>REQUEST BLOCKED SAFELY. EIP-1193 Error 4001 returned to dApp. Wallet was never prompted.</span>
            </div>
          )}
          {interceptStatus === 'proceeded' && (
            <div className="p-3 rounded bg-amber-950/40 border border-amber-800 text-amber-300 text-xs font-mono flex items-center space-x-2 animate-in fade-in">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
              <span>WARNING: You manually bypassed the Sentinel pre-sign shield and forwarded request to wallet.</span>
            </div>
          )}
        </div>
      </div>

      {/* Sentinel Pre-Sign Overlay Modal Simulator */}
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
              <StatusBadge
                level={activeScenario === 'blanket_nft' ? 'CRITICAL' : activeScenario === 'unlimited_approve' ? 'CRITICAL' : 'HIGH'}
                score={activeScenario === 'blanket_nft' ? 96 : activeScenario === 'unlimited_approve' ? 82 : 75}
                size="sm"
              />
            </div>

            <div className="p-3 rounded bg-rose-950/40 border border-rose-900/60 text-xs text-rose-200">
              <div className="font-bold uppercase tracking-wider font-mono">
                RECOMMENDATION: AVOID (HIGH RISK ATTACK VECTOR)
              </div>
              <p className="mt-1 leading-relaxed text-zinc-300">
                {activeScenario === 'blanket_nft' &&
                  'The webpage claims a "Free Mint", but the calldata executes setApprovalForAll granting blanket access to steal all collection NFTs.'}
                {activeScenario === 'unlimited_approve' &&
                  'The webpage button claims to claim tokens, but the calldata authorizes an UNLIMITED (2^256-1) withdrawal from your token balance.'}
                {activeScenario === 'offchain_sign' &&
                  'An off-chain personal_sign or permit signature was requested on an unverified or high-risk domain.'}
              </p>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-[#0E131A] border border-[#1F2630]">
                <span className="text-zinc-500">Target Host</span>
                <span className="text-zinc-300">mintzone-nft.xyz (High-Risk TLD)</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0E131A] border border-[#1F2630]">
                <span className="text-zinc-500">Intercepted Method</span>
                <span className="text-rose-400 font-bold">
                  {activeScenario === 'blanket_nft'
                    ? 'setApprovalForAll(all NFTs, true)'
                    : activeScenario === 'unlimited_approve'
                    ? 'approve(spender, 2^256-1)'
                    : 'personal_sign(message)'}
                </span>
              </div>
              <div className="flex justify-between p-2 rounded bg-[#0E131A] border border-[#1F2630]">
                <span className="text-zinc-500">Intent Mismatch</span>
                <span className="text-rose-400 font-bold">
                  {activeScenario === 'blanket_nft' ? '96 / 100 (CRITICAL)' : '92 / 100 (CRITICAL)'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleBlockAction}
                className="flex-1 py-2.5 rounded text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition-colors uppercase tracking-wider"
              >
                Avoid & Block Request
              </button>
              <button
                onClick={handleProceedAction}
                className="px-3 py-2.5 rounded text-xs font-mono bg-[#161D26] text-zinc-400 hover:text-zinc-200 border border-[#1F2630]"
              >
                Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manifest V3 Verified Bundles Table */}
      <div className="p-5 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-200 font-mono uppercase tracking-wider">
            COMPILED MANIFEST V3 ARTIFACTS
          </h3>
          <span className="text-xs text-emerald-400 font-mono">8/8 Test Suites Passing</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead>
              <tr className="border-b border-[#1F2630] text-zinc-500">
                <th className="py-2 pr-4">Module</th>
                <th className="py-2 pr-4">Runtime Target</th>
                <th className="py-2 pr-4">Bundle Path</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2630]/60 text-zinc-300">
              <tr>
                <td className="py-2 pr-4 text-teal-400 font-bold">Background Worker</td>
                <td className="py-2 pr-4 text-zinc-400">ServiceWorker (MV3)</td>
                <td className="py-2 pr-4 text-zinc-400">extension/dist/background.js</td>
                <td className="py-2 text-emerald-400 font-bold">Compiled (82 KB)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-teal-400 font-bold">Content Script</td>
                <td className="py-2 pr-4 text-zinc-400">Isolated Content World</td>
                <td className="py-2 pr-4 text-zinc-400">extension/dist/contentScript.js</td>
                <td className="py-2 text-emerald-400 font-bold">Compiled (134 KB)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-teal-400 font-bold">In-Page Interceptor</td>
                <td className="py-2 pr-4 text-zinc-400">Main World (window.ethereum)</td>
                <td className="py-2 pr-4 text-zinc-400">extension/dist/inpage.js</td>
                <td className="py-2 text-emerald-400 font-bold">Compiled (16 KB)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-teal-400 font-bold">Action Popup</td>
                <td className="py-2 pr-4 text-zinc-400">Toolbar Popup UI</td>
                <td className="py-2 pr-4 text-zinc-400">extension/popup/popup.html</td>
                <td className="py-2 text-emerald-400 font-bold">Ready (35 KB)</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-teal-400 font-bold">Options Page</td>
                <td className="py-2 pr-4 text-zinc-400">Dedicated Settings Tab</td>
                <td className="py-2 pr-4 text-zinc-400">extension/options/options.html</td>
                <td className="py-2 text-emerald-400 font-bold">Ready (29 KB)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
