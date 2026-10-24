import React, { useState } from 'react';
import {
  Globe,
  FileCode,
  MessageSquare,
  Box,
  FileCheck,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Copy,
  Check,
} from 'lucide-react';
import {
  TargetForm,
  TransactionForm,
  MessageForm,
  SandboxRunnerView,
  ContractScanForm,
} from '../components/scanner/ScannerForms';
import {
  ScoreGauge,
  RecommendationBanner,
  ReasonList,
  IntentCard,
  MismatchCard,
  CounterfactualCard,
  ContractAnalysisView,
} from '../components/scanner/ScannerComponents';
import { useSecurity } from '../context/SecurityContext';

export const Scanner: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  const {
    activeTargetScan,
    activeTxScan,
    activeContractScan,
    explainSimply,
    language,
    isDemoDataset,
  } = useSecurity();
  const [activeTab, setActiveTab] = useState<'target' | 'transaction' | 'message' | 'sandbox' | 'contract'>('target');
  const [copiedHash, setCopiedHash] = useState(false);

  const scan = activeTab === 'transaction' ? activeTxScan : activeTargetScan;

  const handleCopyProof = () => {
    if (scan.evidence?.canonicalHash) {
      navigator.clipboard.writeText(scan.evidence.canonicalHash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Pre-Transaction Scanner</h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time multi-vector analysis of Web3 websites, calldata, and signatures before signing
          </p>
        </div>

        {isDemoDataset && scan.isDemo && (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800 self-start sm:self-auto">
            Demo dataset active
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1F2630] gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('target')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors shrink-0 ${
            activeTab === 'target'
              ? 'border-teal-400 text-teal-300 bg-teal-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Web3 Target / URL</span>
        </button>

        <button
          onClick={() => setActiveTab('contract')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors shrink-0 ${
            activeTab === 'contract'
              ? 'border-teal-400 text-teal-300 bg-teal-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Smart Contract</span>
        </button>

        <button
          onClick={() => setActiveTab('transaction')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors shrink-0 ${
            activeTab === 'transaction'
              ? 'border-teal-400 text-teal-300 bg-teal-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Transaction Calldata</span>
        </button>

        <button
          onClick={() => setActiveTab('message')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors shrink-0 ${
            activeTab === 'message'
              ? 'border-teal-400 text-teal-300 bg-teal-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Phishing Message</span>
        </button>

        <button
          onClick={() => setActiveTab('sandbox')}
          className={`flex items-center space-x-2 px-4 py-2 text-xs font-medium border-b-2 transition-colors shrink-0 ${
            activeTab === 'sandbox'
              ? 'border-teal-400 text-teal-300 bg-teal-950/20'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>Burner Sandbox</span>
        </button>
      </div>

      {/* Input Forms */}
      {activeTab === 'target' && <TargetForm />}
      {activeTab === 'contract' && <ContractScanForm />}
      {activeTab === 'transaction' && <TransactionForm />}
      {activeTab === 'message' && <MessageForm />}
      {activeTab === 'sandbox' && <SandboxRunnerView />}

      {/* Results Section */}
      {activeTab === 'contract' ? (
        <div className="space-y-4 pt-4 border-t border-[#1F2630]">
          {activeContractScan ? (
            <ContractAnalysisView scan={activeContractScan} navigate={navigate} />
          ) : (
            <div className="p-8 rounded-lg bg-[#11161D] border border-[#1F2630] text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-teal-950/60 border border-teal-800/80 flex items-center justify-center mx-auto text-teal-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Live On-Chain Smart Contract Security Scanner
              </h3>
              <p className="text-xs text-zinc-400 max-w-xl mx-auto leading-relaxed">
                Enter an Ethereum Sepolia or Mainnet contract address above and click{' '}
                <strong className="text-teal-400">Scan Contract</strong>. ChainShield retrieves live runtime bytecode from Ethereum nodes via JSON-RPC, downloads verified Solidity source files from Etherscan V2 / Sourcify, parses AST structures to detect unrestricted minting and privilege escalations, and computes deterministic evidence-backed risk scores.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 pt-4 border-t border-[#1F2630]">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">
              Analysis Findings & Explainable Verdict
            </h2>
          <span className="text-xs font-mono text-zinc-400">
            Target: <strong className="text-teal-400">{'target' in scan ? scan.target : scan.methodName}</strong>
          </span>
        </div>

        {/* 1. Score Gauge + 3D Risk Core */}
        <ScoreGauge
          score={scan.riskScore}
          level={scan.riskLevel}
          confidence={scan.confidence}
          rulesScore={'rulesScore' in scan ? scan.rulesScore : scan.riskScore}
          mlScore={'mlScore' in scan ? scan.mlScore : scan.riskScore}
        />

        {/* 2. Recommendation Banner */}
        <RecommendationBanner
          recommendation={scan.recommendation}
          text={scan.recommendationText}
        />

        {/* 3. Reason Contributions with points */}
        <ReasonList reasons={scan.reasons} />

        {/* 4. Claim-vs-Reality Mismatch (if present) */}
        {scan.mismatch && <MismatchCard mismatch={scan.mismatch} />}

        {/* 5. Decoded Intent Card */}
        {scan.intent && (
          <IntentCard
            intent={scan.intent}
            explainSimply={explainSimply}
            language={language}
          />
        )}

        {/* 6. Simulation Card */}
        {scan.simulation && (
          <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-zinc-200">
                Transaction Simulation Preview ({scan.simulation.simulationProvider})
              </h3>
              <span className="text-[10px] font-mono text-zinc-400">
                Gas: {scan.simulation.gasEstimated}
              </span>
            </div>
            <p className="text-xs font-mono text-zinc-300 p-2.5 rounded bg-[#0E131A] border border-[#1F2630]">
              {scan.simulation.plainSummary}
            </p>
            {scan.simulation.approvalsGranted.length > 0 && (
              <div className="mt-2 text-xs">
                <span className="text-[10px] font-mono text-rose-400 block mb-1">
                  APPROVALS GRANTED ON-CHAIN:
                </span>
                {scan.simulation.approvalsGranted.map((appr, i) => (
                  <div
                    key={i}
                    className="p-2 rounded bg-rose-950/20 border border-rose-900/50 flex items-center justify-between font-mono"
                  >
                    <span>{appr.symbol}</span>
                    <span className="text-rose-400 font-bold">{appr.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 7. Counterfactual Analysis Card */}
        {scan.counterfactual && <CounterfactualCard counterfactual={scan.counterfactual} />}

        {/* 8. Drainer Kit & Visual Clone Badges (if present) */}
        {'drainerMatch' in scan && scan.drainerMatch && (
          <div className="p-4 rounded-lg bg-rose-950/20 border border-rose-800/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-rose-400 block font-semibold">
                DRAINER KIT MATCH DETECTED ({scan.drainerMatch.similarityScore}% MinHash Similarity)
              </span>
              <span className="text-xs text-zinc-200 font-bold block mt-0.5">
                Family: {scan.drainerMatch.kitName} ({scan.drainerMatch.family})
              </span>
              <div className="text-[10px] text-zinc-400 mt-1 font-mono">
                Matched Signatures: {scan.drainerMatch.signaturesMatched.join(' • ')}
              </div>
            </div>
            <button
              onClick={() => navigate('/drainer-kits')}
              className="px-3 py-1 text-xs font-mono rounded bg-rose-900/60 text-rose-200 border border-rose-700 hover:bg-rose-800 shrink-0"
            >
              Kit Dossier →
            </button>
          </div>
        )}

        {/* 9. Sepolia Evidence Anchoring Section */}
        {scan.evidence && (
          <div className="p-4 rounded-lg bg-[#0E131A] border border-teal-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-semibold text-zinc-200">
                  Tamper-Evident Evidence Anchored on Sepolia
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-teal-950 text-teal-300 rounded border border-teal-800">
                  Report #{scan.evidence.reportId}
                </span>
              </div>
              <div className="text-[11px] font-mono text-zinc-400 mt-1 truncate max-w-md">
                SHA-256: {scan.evidence.canonicalHash}
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={handleCopyProof}
                className="px-3 py-1.5 rounded text-xs font-mono bg-[#161D26] text-zinc-200 border border-[#1F2630] hover:border-zinc-600 transition-colors flex items-center space-x-1"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedHash ? 'Copied' : 'Copy Hash'}</span>
              </button>
              <button
                onClick={() => navigate(`/verify?reportId=${scan.evidence?.reportId}`)}
                className="px-3 py-1.5 rounded text-xs font-mono bg-teal-950 text-teal-300 border border-teal-700 hover:bg-teal-900 transition-colors flex items-center space-x-1"
              >
                <span>Verify on Sepolia</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
