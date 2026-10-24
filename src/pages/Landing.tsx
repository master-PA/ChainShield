import React from 'react';
import {
  Shield,
  ArrowRight,
  Lock,
  Layers,
  Terminal,
  FileCheck,
  BellRing,
  HelpCircle,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { HeroScene } from '../three/HeroScene';
import { useSecurity } from '../context/SecurityContext';

interface LandingProps {
  navigate: (route: string) => void;
}

export const Landing: React.FC<LandingProps> = ({ navigate }) => {
  const { allScans, tripwireAlerts, loadRohitExample } = useSecurity();

  const handleStartRohitExample = () => {
    loadRohitExample();
    navigate('/scanner?target=https%3A%2F%2Fmintzone-nft.xyz');
  };

  const steps = [
    {
      num: '01',
      title: 'Intercept & Ingest',
      desc: 'The Chrome Extension or Web Console captures the target URL, transaction calldata, or raw message prior to wallet connection.',
    },
    {
      num: '02',
      title: 'Private Prefix Check',
      desc: 'An 8-character SHA-256 host prefix queries the decentralized blocklist without revealing your browsing destination.',
    },
    {
      num: '03',
      title: 'Multi-Vector Heuristics',
      desc: 'Evaluates domain registration age, redirect hops, homoglyph typosquatting, and MinHash JS code shingle drainer signatures.',
    },
    {
      num: '04',
      title: 'Burner-Wallet Sandbox',
      desc: 'An isolated headless container with a mock EIP-1193 provider connects an empty address to record auto-prompts without risk.',
    },
    {
      num: '05',
      title: 'Claim-vs-Reality Check',
      desc: 'Deterministic keyword taxonomy compares button promises ("Claim free NFT") against decoded calldata (setApprovalForAll).',
    },
    {
      num: '06',
      title: 'Sepolia Proof Anchor',
      desc: 'Scan payload is serialized into canonical JSON, hashed with SHA-256, and permanently recorded on the Sepolia EvidenceRegistry.',
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-[#161D26] border border-[#1F2630] text-teal-400 text-xs font-mono mb-4">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Deterministic Pre-Transaction Security</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-100 leading-tight">
            Stop Web3 Drainers <span className="text-teal-400">Before</span> You Connect Or Sign
          </h1>

          <p className="mt-4 text-sm text-zinc-400 leading-relaxed max-w-xl">
            ChainShield Sentinel answers what you are about to authorize, whether the target is
            suspicious, what the page claims versus what will actually happen, and how to stay safe.
            Powered strictly by supervised classical ML and deterministic rules—0% generative AI.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/scanner')}
              className="px-5 py-2.5 rounded-md bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs transition-colors flex items-center space-x-2 shadow-lg"
            >
              <span>Launch Pre-Transaction Scanner</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleStartRohitExample}
              className="px-4 py-2.5 rounded-md bg-[#161D26] hover:bg-[#1F2634] text-zinc-200 border border-[#1F2630] font-medium text-xs transition-colors"
            >
              Walkthrough: Rohit's NFT Drainer
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="mt-8 grid grid-cols-3 gap-3 border-t border-[#1F2630] pt-6 text-center sm:text-left">
            <div>
              <div className="text-lg font-mono font-bold text-zinc-100">7,830+</div>
              <div className="text-[11px] text-zinc-500">Scans Analyzed</div>
            </div>
            <div>
              <div className="text-lg font-mono font-bold text-rose-400">1,845</div>
              <div className="text-[11px] text-zinc-500">Drainers Blocked</div>
            </div>
            <div>
              <div className="text-lg font-mono font-bold text-teal-400">100%</div>
              <div className="text-[11px] text-zinc-500">Deterministic Rules & ML</div>
            </div>
          </div>
        </div>

        {/* 3D Hero Shield Scene */}
        <div className="rounded-xl bg-[#0E131A] border border-[#1F2630] p-4 flex flex-col items-center justify-center relative overflow-hidden">
          <HeroScene />
          <div className="text-center mt-2">
            <span className="text-[11px] font-mono text-zinc-400">
              Interactive 3D Cryptographic Shield • Drag with mouse
            </span>
          </div>
        </div>
      </section>

      {/* Worked Example Walkthrough Banner (Section 1 in Prompt) */}
      <section className="p-6 rounded-xl bg-[#11161D] border border-teal-800/40 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-xs font-mono text-teal-400 uppercase tracking-wider font-semibold">
              WORKED CASE STUDY: ROHIT'S TELEGRAM NFT INCIDENT
            </div>
            <h2 className="text-lg font-bold text-zinc-100 mt-1">
              "Free NFT mint: mintzone-nft.xyz" — Breakdown of a Multi-Stage Drainer Attack
            </h2>
          </div>
          <button
            onClick={handleStartRohitExample}
            className="px-4 py-2 rounded-md bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs shrink-0 flex items-center space-x-1.5"
          >
            <span>Open in Scanner</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-[#0E131A] border border-[#1F2630]">
            <span className="font-mono text-teal-400 block mb-1">1. SOURCE & FINGERPRINT</span>
            <p className="text-zinc-300">
              Link arrived via unsolicited Telegram DM (+10 pts). Domain registered 2 days ago (+20 pts).
              JS bundle matched Inferno Drainer at 87% similarity (+25 pts).
            </p>
          </div>
          <div className="p-3 rounded bg-[#0E131A] border border-[#1F2630]">
            <span className="font-mono text-amber-400 block mb-1">2. CLAIM VS REALITY</span>
            <p className="text-zinc-300">
              Button claims "Claim Free NFT", but the burner sandbox caught immediate prompt for{' '}
              <code className="text-rose-400">setApprovalForAll(all NFTs, true)</code> (Intent Mismatch 96/100).
            </p>
          </div>
          <div className="p-3 rounded bg-[#0E131A] border border-[#1F2630]">
            <span className="font-mono text-rose-400 block mb-1">3. VERDICT & PROOF</span>
            <p className="text-zinc-300">
              Score 91, CRITICAL, recommendation AVOID. Canonical scan findings hashed and anchored on
              Ethereum Sepolia (Report #5410982).
            </p>
          </div>
        </div>
      </section>

      {/* 6 Steps: How It Works */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-zinc-100">How ChainShield Sentinel Operates</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Six distinct validation layers safeguard every wallet interaction in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((st) => (
            <div
              key={st.num}
              className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col justify-between"
            >
              <div>
                <span className="font-mono text-xs text-teal-400 font-bold block mb-1">
                  {st.num}
                </span>
                <h3 className="text-sm font-semibold text-zinc-200">{st.title}</h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{st.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-xl font-bold text-zinc-100">Enterprise Pre-Transaction Tooling</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Built for threat analysts, Web3 developers, and security-conscious users.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            onClick={() => navigate('/wallet-health')}
            className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] hover:border-zinc-700 cursor-pointer transition-colors"
          >
            <Shield className="w-5 h-5 text-teal-400 mb-2" />
            <h4 className="text-xs font-semibold text-zinc-200">Wallet Health & Revoke</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              Audit all existing allowances and build zero-allowance revoke transactions.
            </p>
          </div>

          <div
            onClick={() => navigate('/alerts')}
            className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] hover:border-zinc-700 cursor-pointer transition-colors"
          >
            <BellRing className="w-5 h-5 text-rose-400 mb-2" />
            <h4 className="text-xs font-semibold text-zinc-200">Upgrade Tripwire</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              Instant alerts when an approved proxy implementation updates to unverified bytecode.
            </p>
          </div>

          <div
            onClick={() => navigate('/verify')}
            className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] hover:border-zinc-700 cursor-pointer transition-colors"
          >
            <FileCheck className="w-5 h-5 text-emerald-400 mb-2" />
            <h4 className="text-xs font-semibold text-zinc-200">Sepolia Evidence Anchor</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              Tamper-evident verification comparing local SHA-256 against on-chain smart contracts.
            </p>
          </div>

          <div
            onClick={() => navigate('/extension')}
            className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] hover:border-zinc-700 cursor-pointer transition-colors"
          >
            <Terminal className="w-5 h-5 text-teal-400 mb-2" />
            <h4 className="text-xs font-semibold text-zinc-200">Chrome Extension MV3</h4>
            <p className="text-[11px] text-zinc-400 mt-1">
              Pre-sign modal intercepts eth_sendTransaction before your wallet prompt appears.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
