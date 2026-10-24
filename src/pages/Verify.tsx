import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { EvidenceChain } from '../three/EvidenceChain';
import { useSecurity } from '../context/SecurityContext';
import { buildCanonicalScanPayload, hashCanonicalScanPayload } from '../lib/canonicalJson';

export const Verify: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  const { allScans, isDemoDataset } = useSecurity();
  const [reportIdInput, setReportIdInput] = useState('REP-SEPOLIA-2024-88210');
  const [activeReport, setActiveReport] = useState<(typeof allScans)[0] | null>(allScans[0] || null);

  const [localComputedHash, setLocalComputedHash] = useState<string>('');
  const [onChainHash, setOnChainHash] = useState<string>('');
  const [verificationStatus, setVerificationStatus] = useState<'VERIFIED' | 'TAMPERED' | 'UNANCHORED'>('VERIFIED');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTamperedSimulated, setIsTamperedSimulated] = useState(false);

  useEffect(() => {
    // Initial verification of active report
    if (activeReport?.evidence) {
      handleVerify(activeReport, false);
    }
  }, [activeReport]);

  const handleVerify = async (report: (typeof allScans)[0], simulatedTamper = false) => {
    setIsVerifying(true);
    await new Promise((r) => setTimeout(r, 400));

    const rawPayload = buildCanonicalScanPayload(
      report,
      simulatedTamper
        ? {
            rulesScore: 12, // simulate intentional tampering
            finalScore: 15,
            riskLevel: 'LOW',
          }
        : undefined
    );

    const hash = await hashCanonicalScanPayload(rawPayload);

    setLocalComputedHash(hash);
    const chainHash = report.evidence?.canonicalHash || '0x0000000000000000000000000000000000000000';
    setOnChainHash(chainHash);

    if (!report.evidence?.canonicalHash) {
      setVerificationStatus('UNANCHORED');
    } else if (hash.toLowerCase() === chainHash.toLowerCase()) {
      setVerificationStatus('VERIFIED');
    } else {
      setVerificationStatus('TAMPERED');
    }

    setIsTamperedSimulated(simulatedTamper);
    setIsVerifying(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-zinc-100">Sepolia Evidence Verification</h1>
            {isDemoDataset && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                Demo dataset
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Cryptographic local hash integrity verification via canonical JSON serialization (Sepolia anchor simulated)
          </p>
        </div>
      </div>

      {/* 3D Evidence Chain Visualization */}
      <EvidenceChain
        verifiedHash={onChainHash || '0x49e4d8fba0a9c3e02feb02224862851bde4002e4321548f2266f0f90765eb969'}
        isAnchored={verificationStatus === 'VERIFIED'}
        blockNumber={5410982}
      />

      {/* Verification Query Bar */}
      <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={reportIdInput}
            onChange={(e) => setReportIdInput(e.target.value)}
            placeholder="Enter Report ID (e.g. REP-SEPOLIA-2024-88210)..."
            className="w-full bg-[#161D26] border border-[#1F2630] rounded-md pl-9 pr-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-teal-500"
          />
        </div>
        <button
          onClick={() => {
            const found = allScans.find((s) => s.evidence?.reportId === reportIdInput) || allScans[0];
            setActiveReport(found);
            handleVerify(found, false);
          }}
          disabled={isVerifying}
          className="px-4 py-2 rounded bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs flex items-center space-x-1.5 transition-colors shrink-0 disabled:opacity-50 w-full sm:w-auto justify-center"
        >
          {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
          <span>Recompute & Verify Hash</span>
        </button>
      </div>

      {/* Status Verdict Banner */}
      <div
        className={`p-4 rounded-lg border flex items-center justify-between ${
          verificationStatus === 'VERIFIED'
            ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
            : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
        }`}
      >
        <div className="flex items-center space-x-3">
          {verificationStatus === 'VERIFIED' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider">
              VERIFICATION STATUS: {verificationStatus}
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              {verificationStatus === 'VERIFIED'
                ? 'Client local SHA-256 matches the stored evidence anchor record. Local payload integrity is confirmed (on-chain Sepolia anchor is simulated).'
                : verificationStatus === 'UNANCHORED'
                ? 'No stored anchor record exists for this report.'
                : 'SECURITY ALERT: Local hash does not match the stored evidence anchor. Report content or parameters have been tampered with!'}
            </p>
          </div>
        </div>

        {/* Tampering Simulator Button (Acceptance requirement) */}
        <button
          onClick={() => {
            if (activeReport) {
              handleVerify(activeReport, !isTamperedSimulated);
            }
          }}
          className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors shrink-0 ${
            isTamperedSimulated
              ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
              : 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900'
          }`}
        >
          {isTamperedSimulated ? 'Reset to Legitimate' : 'Simulate Tampering (Test Proof)'}
        </button>
      </div>

      {/* Hash Comparison Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Recomputed Hash */}
        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200">Local Browser SHA-256 Recomputation</span>
            <span className="font-mono text-[10px] text-teal-400">Web Crypto Subtle</span>
          </div>
          <div className="p-2.5 rounded bg-[#0E131A] border border-[#1F2630] font-mono text-xs text-zinc-300 break-all">
            {localComputedHash || activeReport?.evidence?.canonicalHash}
          </div>
          <p className="text-[11px] text-zinc-500">
            Computed deterministically from sorted, whitespace-free canonical JSON payload.
          </p>
        </div>

        {/* On-Chain Sepolia Hash */}
        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200">Simulated Sepolia Anchor</span>
            <span className="font-mono text-[10px] text-zinc-400">EvidenceRegistry.sol (Simulated)</span>
          </div>
          <div className="p-2.5 rounded bg-[#0E131A] border border-[#1F2630] font-mono text-xs text-zinc-300 break-all">
            {onChainHash || activeReport?.evidence?.canonicalHash}
          </div>
          <p className="text-[11px] text-zinc-500">
            Simulated contract record at <code className="text-zinc-400">0x9918237F012891c9...</code> (Block #5410982).
          </p>
        </div>
      </div>
    </div>
  );
};
