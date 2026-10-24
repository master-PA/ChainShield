import React, { useState } from 'react';
import {
  Globe,
  FileCode,
  MessageSquare,
  Box,
  Lock,
  ArrowRight,
  ShieldAlert,
  Terminal,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { LinkSource, SandboxRunResult } from '../../types/security';
import { runBurnerSandbox } from '../../lib/mockSandbox';

export const TargetForm: React.FC = () => {
  const { runTargetScan, isScanning, loadRohitExample } = useSecurity();
  const [target, setTarget] = useState('https://mintzone-nft.xyz');
  const [linkSource, setLinkSource] = useState<LinkSource>('telegram_dm');
  const [isPrivateCheck, setIsPrivateCheck] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;
    runTargetScan(target.trim(), linkSource, isPrivateCheck);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-4">
      <div>
        <label className="text-xs font-semibold text-zinc-200 block mb-1.5">
          Target Web3 URL, Domain, or Contract Address
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="e.g. mintzone-nft.xyz or 0xAbc99..."
            className="flex-1 bg-[#161D26] border border-[#1F2630] rounded-md px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
          />
          <button
            type="submit"
            disabled={isScanning || !target.trim()}
            className="px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs transition-colors flex items-center space-x-1.5 shrink-0 disabled:opacity-50"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Scanning...</span>
              </>
            ) : (
              <>
                <span>Run Scan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#1F2630]">
        {/* Link Source Selector */}
        <div>
          <label className="text-[11px] font-mono text-zinc-400 block mb-1">
            ORIGIN / SOURCE OF LINK (Signal)
          </label>
          <select
            value={linkSource}
            onChange={(e) => setLinkSource(e.target.value as LinkSource)}
            className="w-full bg-[#161D26] border border-[#1F2630] rounded-md px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-teal-500"
          >
            <option value="telegram_dm">Telegram DM (Unsolicited +15 pts)</option>
            <option value="discord">Discord Channel or DM (+10 pts)</option>
            <option value="twitter_reply">X / Twitter Reply (+10 pts)</option>
            <option value="email">Email Phishing (+8 pts)</option>
            <option value="search">Search Engine (+2 pts)</option>
            <option value="direct">Direct Bookmark / Verified (0 pts)</option>
          </select>
        </div>

        {/* Private Check Toggle */}
        <div className="flex flex-col justify-center">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-zinc-400 flex items-center gap-1">
              <Lock className="w-3 h-3 text-teal-400" />
              <span>PRIVATE CHECK (8-char SHA-256 Prefix)</span>
            </span>
            <input
              type="checkbox"
              checked={isPrivateCheck}
              onChange={(e) => setIsPrivateCheck(e.target.checked)}
              className="rounded bg-[#161D26] border-[#1F2630] text-teal-500 focus:ring-0 cursor-pointer"
            />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1 leading-tight">
            Only the first 8 hex characters of the target's SHA-256 host hash leave your browser.
          </p>
        </div>
      </div>

      {/* Rohit Example Preset Trigger */}
      <div className="pt-2 border-t border-[#1F2630]/60 flex items-center justify-between text-[11px]">
        <span className="text-zinc-500">Need a demonstration target?</span>
        <button
          type="button"
          onClick={() => {
            setTarget('https://mintzone-nft.xyz');
            setLinkSource('telegram_dm');
            loadRohitExample();
          }}
          className="text-teal-400 font-mono hover:underline"
        >
          Load Rohit's Telegram Mintzone Example →
        </button>
      </div>
    </form>
  );
};

export const TransactionForm: React.FC = () => {
  const { runTxScan, isScanning } = useSecurity();
  const [calldata, setCalldata] = useState(
    '0x095ea7b30000000000000000000000007a250d5630b4cf539739df2c5dacb4c659f2488dffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
  );
  const [pageClaim, setPageClaim] = useState('Claim Free Whitelist NFT');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!calldata.trim()) return;
    runTxScan(calldata.trim(), pageClaim.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-3">
      <div>
        <label className="text-xs font-semibold text-zinc-200 block mb-1">
          Raw EVM Calldata or EIP-712 Signature Payload
        </label>
        <textarea
          rows={3}
          value={calldata}
          onChange={(e) => setCalldata(e.target.value)}
          placeholder="0x095ea7b3... (e.g. approve, setApprovalForAll, permit)"
          className="w-full bg-[#161D26] border border-[#1F2630] rounded-md p-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-zinc-200 block mb-1">
          Page or Button Claim (for Claim-vs-Reality Mismatch Check)
        </label>
        <input
          type="text"
          value={pageClaim}
          onChange={(e) => setPageClaim(e.target.value)}
          placeholder='e.g. "Claim free NFT", "Verify wallet", "Connect with Discord"'
          className="w-full bg-[#161D26] border border-[#1F2630] rounded-md px-3 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
        />
      </div>

      <button
        type="submit"
        disabled={isScanning || !calldata.trim()}
        className="w-full py-2 rounded-md bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 disabled:opacity-50"
      >
        {isScanning ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Decoding & Simulating...</span>
          </>
        ) : (
          <>
            <span>Decode Transaction & Verify Claim</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </form>
  );
};

export const MessageForm: React.FC = () => {
  const { runMessageScan, activeMessageScan, isScanning } = useSecurity();
  const [messageText, setMessageText] = useState(
    'Bhai urgent! Free NFT airdrop live hai mintzone-nft.xyz par. Jaldi claim karo sirf 100 spots bache hain!'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    runMessageScan(messageText.trim());
  };

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold text-zinc-200 block mb-1">
            Suspicious Telegram / WhatsApp / Discord Message (English + Hinglish Supported)
          </label>
          <textarea
            rows={3}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Paste unsolicited message text..."
            className="w-full bg-[#161D26] border border-[#1F2630] rounded-md p-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <button
          type="submit"
          disabled={isScanning || !messageText.trim()}
          className="px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
        >
          {isScanning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
          <span>Run Supervised Message Classifier</span>
        </button>
      </form>

      {/* Result if scanned */}
      {activeMessageScan && (
        <div className="p-4 rounded-lg bg-[#0E131A] border border-[#1F2630] space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-mono text-zinc-400 uppercase">
                CATEGORY: {activeMessageScan.scamCategory.replace(/_/g, ' ')}
              </span>
              <div className="text-[11px] text-zinc-500 font-mono">
                Language: {activeMessageScan.languageDetected.toUpperCase()} • Confidence:{' '}
                {activeMessageScan.confidence}%
              </div>
            </div>
            <div className="text-right">
              <span
                className={`font-mono text-sm font-bold ${
                  activeMessageScan.riskScore >= 75
                    ? 'text-rose-400'
                    : activeMessageScan.riskScore >= 50
                      ? 'text-orange-400'
                      : 'text-emerald-400'
                }`}
              >
                {activeMessageScan.riskScore}/100 {activeMessageScan.riskLevel}
              </span>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed p-2.5 rounded bg-[#161D26] border border-[#1F2630]">
            {activeMessageScan.actionRecommendation}
          </p>

          <div className="space-y-1.5">
            {activeMessageScan.reasons.map((r) => (
              <div
                key={r.id}
                className="p-2 rounded bg-[#11161D] text-xs flex items-center justify-between text-zinc-300 border border-[#1F2630]"
              >
                <span>{r.description}</span>
                <span className="font-mono text-rose-400 font-semibold">+{r.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SandboxRunnerView: React.FC = () => {
  const [sandboxTarget, setSandboxTarget] = useState('https://mintzone-nft.xyz');
  const [loading, setLoading] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<SandboxRunResult | null>(null);

  const handleRun = async () => {
    setLoading(true);
    const result = await runBurnerSandbox(sandboxTarget);
    setSandboxResult(result);
    setLoading(false);
  };

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={sandboxTarget}
          onChange={(e) => setSandboxTarget(e.target.value)}
          placeholder="Target URL for isolated sandbox test..."
          className="flex-1 bg-[#161D26] border border-[#1F2630] rounded-md px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500"
        />
        <button
          onClick={handleRun}
          disabled={loading || !sandboxTarget.trim()}
          className="px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 shrink-0 disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Running Sandbox Worker...</span>
            </>
          ) : (
            <>
              <Terminal className="w-3.5 h-3.5" />
              <span>Connect Burner Sandbox</span>
            </>
          )}
        </button>
      </div>

      <div className="p-3 rounded bg-[#0E131A] border border-[#1F2630] text-[11px] text-zinc-400 space-y-1">
        <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-teal-400" />
          <span>Sandbox Isolation Guarantees</span>
        </div>
        <p>• Isolated Playwright Chromium container with zero persistent storage.</p>
        <p>• Mock EIP-1193 injected provider with empty burner address. NEVER signs or broadcasts.</p>
        <p>• Internal network IP ranges blocked. Auto-prompt detection flags drainers within 500ms.</p>
      </div>

      {sandboxResult && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono text-zinc-300">
              Logged RPC Requests ({sandboxResult.totalRequests})
            </span>
            <span
              className={`font-mono font-semibold ${
                sandboxResult.drainerBehaviorDetected ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {sandboxResult.drainerBehaviorDetected
                ? 'DRAINER BEHAVIOR CONFIRMED'
                : 'CLEAN INTERACTION'}
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {sandboxResult.requests.map((req) => (
              <div
                key={req.id}
                className={`p-2.5 rounded border ${
                  req.wasBlocked
                    ? 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                    : 'bg-[#161D26] border-[#1F2630] text-zinc-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-teal-400">{req.method}</span>
                  <span className="text-[10px] text-zinc-500">
                    {req.wasBlocked ? 'INTERCEPTED & BLOCKED' : 'RESOLVED'}
                  </span>
                </div>
                <div className="text-[11px] mt-1 text-zinc-400">{req.riskAssessment}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
