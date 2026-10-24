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
  Globe,
  Coins,
  Clock,
  ArrowUpRight,
  HelpCircle,
} from 'lucide-react';
import { EvidenceChain } from '../three/EvidenceChain';
import { useSecurity } from '../context/SecurityContext';
import { buildCanonicalScanPayload, hashCanonicalScanPayload } from '../lib/canonicalJson';
import {
  queryOnChainEvidence,
  anchorEvidenceWithWallet,
  getBlockchainConfig,
  OnChainVerificationResult,
} from '../lib/blockchainEvidence';

export const Verify: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  const { allScans, isDemoDataset, updateScanEvidence } = useSecurity();
  const [reportIdInput, setReportIdInput] = useState('REP-SEPOLIA-2024-88210');
  const [activeReport, setActiveReport] = useState<(typeof allScans)[0] | null>(allScans[0] || null);

  const [localComputedHash, setLocalComputedHash] = useState<string>('');
  const [onChainHash, setOnChainHash] = useState<string>('');
  const [localVerificationStatus, setLocalVerificationStatus] = useState<'VERIFIED' | 'TAMPERED' | 'UNANCHORED'>('VERIFIED');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTamperedSimulated, setIsTamperedSimulated] = useState(false);

  // Real On-Chain Sepolia state
  const [onChainResult, setOnChainResult] = useState<OnChainVerificationResult | null>(null);
  const [isOnChainChecking, setIsOnChainChecking] = useState<boolean>(false);
  const [isAnchoring, setIsAnchoring] = useState<boolean>(false);
  const [anchorMessage, setAnchorMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; txHash?: string } | null>(null);

  const blockchainConfig = getBlockchainConfig();

  useEffect(() => {
    // Initial verification of active report on load / selection change
    if (activeReport) {
      handleVerify(activeReport, false);
    }
  }, [activeReport]);

  const handleVerify = async (report: (typeof allScans)[0], simulatedTamper = false) => {
    setIsVerifying(true);
    setIsOnChainChecking(true);
    setAnchorMessage(null);

    // 1. Recompute local deterministic canonical SHA-256 hash
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

    const storedEvidenceHash = report.evidence?.canonicalHash || '';
    setOnChainHash(storedEvidenceHash);

    if (!storedEvidenceHash) {
      setLocalVerificationStatus('UNANCHORED');
    } else if (hash.toLowerCase() === storedEvidenceHash.toLowerCase()) {
      setLocalVerificationStatus('VERIFIED');
    } else {
      setLocalVerificationStatus('TAMPERED');
    }

    setIsTamperedSimulated(simulatedTamper);
    setIsVerifying(false);

    // 2. Query real on-chain Sepolia contract (if not a pure mock demo dataset)
    const reportIdToQuery = report.evidence?.reportId || report.id;
    try {
      const liveOnChain = await queryOnChainEvidence(reportIdToQuery);
      setOnChainResult(liveOnChain);

      // If live contract returns anchored record, update the displayed on-chain hash
      if (liveOnChain.status === 'ANCHORED' && liveOnChain.evidence) {
        setOnChainHash(liveOnChain.evidence.evidenceHash);
      }
    } catch (err) {
      setOnChainResult({
        status: 'RPC_ERROR',
        error: String(err),
        network: blockchainConfig.networkName,
        contractAddress: blockchainConfig.contractAddress,
      });
    } finally {
      setIsOnChainChecking(false);
    }
  };

  const handleAnchorOnSepolia = async () => {
    if (!activeReport) return;
    const reportId = activeReport.evidence?.reportId || activeReport.id;
    const hashToAnchor = localComputedHash || activeReport.evidence?.canonicalHash;

    if (!hashToAnchor) {
      setAnchorMessage({ type: 'error', text: 'No evidence hash available to anchor.' });
      return;
    }

    setIsAnchoring(true);
    setAnchorMessage({ type: 'info', text: 'Submitting transaction to Sepolia via Web3 wallet. Please confirm in wallet...' });

    const result = await anchorEvidenceWithWallet(reportId, hashToAnchor);
    setIsAnchoring(false);

    if (result.success && result.txHash) {
      setAnchorMessage({
        type: 'success',
        text: `Successfully anchored on Ethereum Sepolia at block #${result.blockNumber}!`,
        txHash: result.txHash,
      });

      // Update scan evidence record with real transaction and block details
      updateScanEvidence(reportId, {
        isAnchored: true,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        submitter: result.submitter || 'Wallet Submitter',
        contractAddress: result.contractAddress || blockchainConfig.contractAddress,
        chainName: 'Ethereum Sepolia Testnet',
      });

      // Re-run verify to query the newly anchored state
      handleVerify(activeReport, false);
    } else {
      setAnchorMessage({
        type: 'error',
        text: result.error || 'Failed to submit anchoring transaction.',
      });
    }
  };

  const isRealOnChainAnchored = onChainResult?.status === 'ANCHORED';
  const effectiveBlockNumber = onChainResult?.evidence?.blockNumber ?? (activeReport?.isDemo ? activeReport?.evidence?.blockNumber : undefined);
  const effectiveTxHash = onChainResult?.evidence?.txHash ?? (activeReport?.isDemo ? activeReport?.evidence?.txHash : undefined);
  const effectiveSubmitter = onChainResult?.evidence?.submitter ?? (activeReport?.isDemo ? activeReport?.evidence?.submitter : undefined);
  const effectiveContractAddress = onChainResult?.evidence?.contractAddress || blockchainConfig.contractAddress || (activeReport?.isDemo ? activeReport?.evidence?.contractAddress : '');

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-zinc-100">Ethereum Sepolia Evidence Verification</h1>
            {isDemoDataset && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                Demo dataset
              </span>
            )}
            {blockchainConfig.isConfigured ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Sepolia Live</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                Contract Unconfigured
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Dual-layer cryptographic integrity: Local canonical JSON verification and live Ethereum Sepolia contract queries
          </p>
        </div>
      </div>

      {/* 3D Evidence Chain Visualization */}
      <EvidenceChain
        verifiedHash={onChainHash || localComputedHash || '0x49e4d8fba0a9c3e02feb02224862851bde4002e4321548f2266f0f90765eb969'}
        isAnchored={isRealOnChainAnchored || Boolean(activeReport?.isDemo && activeReport?.evidence?.isAnchored)}
        blockNumber={effectiveBlockNumber ?? 5410982}
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
          disabled={isVerifying || isOnChainChecking}
          className="px-4 py-2 rounded bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs flex items-center space-x-1.5 transition-colors shrink-0 disabled:opacity-50 w-full sm:w-auto justify-center"
        >
          {isVerifying || isOnChainChecking ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileCheck className="w-3.5 h-3.5" />}
          <span>Recompute & Verify Hash</span>
        </button>
      </div>

      {/* Layer 1: Local Hash Integrity Verdict */}
      <div
        className={`p-4 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          localVerificationStatus === 'VERIFIED'
            ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-300'
            : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
        }`}
      >
        <div className="flex items-center space-x-3">
          {localVerificationStatus === 'VERIFIED' ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
          )}
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider flex items-center space-x-2">
              <span>LAYER 1 (LOCAL INTEGRITY): {localVerificationStatus}</span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5">
              {localVerificationStatus === 'VERIFIED'
                ? 'Client local SHA-256 matches the report canonical payload deterministically. No local report parameters have been altered.'
                : localVerificationStatus === 'UNANCHORED'
                ? 'No stored evidence hash exists for this local scan record.'
                : 'SECURITY ALERT: Local hash does not match stored evidence! Report content or parameters have been tampered with.'}
            </p>
          </div>
        </div>

        {/* Tampering Simulator Button */}
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
          {isTamperedSimulated ? 'Reset to Legitimate' : 'Simulate Tampering (Test Local Proof)'}
        </button>
      </div>

      {/* Layer 2: Real Ethereum Sepolia Blockchain Status */}
      <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-3">
        <div className="flex items-center justify-between border-b border-[#1F2630] pb-2">
          <div className="flex items-center space-x-2">
            <Globe className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-semibold text-zinc-200">LAYER 2: LIVE ETHEREUM SEPOLIA ANCHOR</span>
          </div>
          <span className="font-mono text-[11px] text-zinc-400">
            Chain ID: 11155111 (Sepolia)
          </span>
        </div>

        {/* Live Status Indicators */}
        {isOnChainChecking ? (
          <div className="flex items-center space-x-2 text-xs text-zinc-400 py-2">
            <RefreshCw className="w-4 h-4 animate-spin text-teal-400" />
            <span>Querying Sepolia EvidenceRegistry contract via JSON-RPC...</span>
          </div>
        ) : onChainResult?.status === 'UNCONFIGURED' ? (
          <div className="p-3 rounded bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300 space-y-1">
            <div className="font-semibold flex items-center space-x-1.5">
              <HelpCircle className="w-4 h-4 text-amber-400" />
              <span>EvidenceRegistry Contract Address Not Configured</span>
            </div>
            <p className="text-zinc-400 text-[11px]">
              To verify against or anchor to a live smart contract on Ethereum Sepolia, set{' '}
              <code className="text-teal-300 bg-[#161D26] px-1 py-0.5 rounded font-mono">
                VITE_EVIDENCE_REGISTRY_ADDRESS="0x..."
              </code>{' '}
              in your <code className="text-zinc-300 font-mono">.env</code> file.
            </p>
            {activeReport?.isDemo && (
              <p className="text-[11px] text-teal-400/80 pt-1">
                Notice: Displaying demo dataset with simulated testnet anchoring (Block #5410982).
              </p>
            )}
          </div>
        ) : onChainResult?.status === 'ANCHORED' ? (
          <div className="p-3 rounded bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>CONFIRMED ON-CHAIN IN SEPOLIA EVIDENCE REGISTRY</span>
              </span>
              <span className="font-mono text-[10px] bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded">
                Live State
              </span>
            </div>
            <p className="text-zinc-300 text-[11px]">
              This report hash is permanently recorded on the Ethereum Sepolia testnet.
              {localComputedHash.toLowerCase() === onChainResult.evidence?.evidenceHash.toLowerCase()
                ? ' The client local SHA-256 hash matches the on-chain smart contract record exactly.'
                : ' WARNING: The local hash differs from the registered on-chain hash!'}
            </p>
          </div>
        ) : onChainResult?.status === 'NOT_ANCHORED' ? (
          <div className="p-3 rounded bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-zinc-200 flex items-center space-x-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Report Not Yet Anchored to Sepolia</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                No record found in the EvidenceRegistry contract for report ID{' '}
                <code className="text-zinc-300 font-mono">{activeReport?.evidence?.reportId || activeReport?.id}</code>.
              </p>
            </div>
            <button
              onClick={handleAnchorOnSepolia}
              disabled={isAnchoring}
              className="px-3 py-1.5 rounded bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs flex items-center space-x-1.5 transition-colors shrink-0 disabled:opacity-50"
            >
              {isAnchoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Coins className="w-3.5 h-3.5" />}
              <span>Anchor on Sepolia via Wallet</span>
            </button>
          </div>
        ) : onChainResult?.status === 'RPC_ERROR' ? (
          <div className="p-3 rounded bg-rose-950/20 border border-rose-800/40 text-xs text-rose-300 space-y-1">
            <div className="font-semibold flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Sepolia JSON-RPC Query Error</span>
            </div>
            <p className="text-zinc-400 text-[11px]">{onChainResult.error}</p>
          </div>
        ) : null}

        {/* Anchor Transaction Status Message */}
        {anchorMessage && (
          <div
            className={`p-3 rounded border text-xs ${
              anchorMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : anchorMessage.type === 'error'
                ? 'bg-rose-950/40 border-rose-800 text-rose-300'
                : 'bg-teal-950/40 border-teal-800 text-teal-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{anchorMessage.text}</span>
              {anchorMessage.txHash && (
                <a
                  href={`https://sepolia.etherscan.io/tx/${anchorMessage.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 font-mono text-[11px] text-teal-300 underline"
                >
                  <span>View on Etherscan</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}
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

        {/* Real On-Chain Sepolia Hash */}
        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200">
              {isRealOnChainAnchored ? 'Live Sepolia Contract Hash' : 'Sepolia Registry Anchor'}
            </span>
            <span className="font-mono text-[10px] text-zinc-400">
              {activeReport?.isDemo && !isRealOnChainAnchored ? 'Simulated Demo' : 'EvidenceRegistry.sol'}
            </span>
          </div>
          <div className="p-2.5 rounded bg-[#0E131A] border border-[#1F2630] font-mono text-xs text-zinc-300 break-all">
            {onChainResult?.evidence?.evidenceHash || (activeReport?.isDemo ? activeReport?.evidence?.canonicalHash : 'Unanchored')}
          </div>
          <div className="text-[11px] text-zinc-500 space-y-1">
            {effectiveContractAddress ? (
              <div className="flex items-center justify-between">
                <span>Contract:</span>
                <a
                  href={`https://sepolia.etherscan.io/address/${effectiveContractAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-zinc-400 hover:text-teal-400 flex items-center space-x-1"
                >
                  <span>{effectiveContractAddress.slice(0, 10)}...{effectiveContractAddress.slice(-8)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : null}
            {effectiveBlockNumber ? (
              <div className="flex items-center justify-between">
                <span>Block:</span>
                <span className="font-mono text-zinc-400">#{effectiveBlockNumber}</span>
              </div>
            ) : null}
            {effectiveSubmitter ? (
              <div className="flex items-center justify-between">
                <span>Submitter:</span>
                <span className="font-mono text-zinc-400">{effectiveSubmitter.slice(0, 8)}...{effectiveSubmitter.slice(-6)}</span>
              </div>
            ) : null}
            {effectiveTxHash ? (
              <div className="flex items-center justify-between">
                <span>Transaction:</span>
                <a
                  href={`https://sepolia.etherscan.io/tx/${effectiveTxHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-teal-400 hover:underline flex items-center space-x-1"
                >
                  <span>{effectiveTxHash.slice(0, 10)}...</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
