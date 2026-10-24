import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Lock,
  EyeOff,
  Copy,
  Check,
  RefreshCw,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Code2,
  Download,
  Info,
} from 'lucide-react';
import {
  ReasonItem,
  IntentSummary,
  IntentMismatch,
  SimulationPreview,
  CounterfactualResult,
  VisualCloneEvidence,
  DrainerKitMatch,
  RiskLevel,
  LinkSource,
  ContractScanResult,
  ContractFinding,
} from '../../types/security';
import { StatusBadge } from '../layout/StatusBadge';
import { RiskCore } from '../../three/RiskCore';
import { shortenAddress } from '../../lib/formatters';

export const ScoreGauge: React.FC<{
  score: number;
  level: RiskLevel;
  confidence: number;
  rulesScore: number;
  mlScore: number;
}> = ({ score, level, confidence, rulesScore, mlScore }) => {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-lg bg-[#11161D] border border-[#1F2630]">
      {/* 3D Risk Core */}
      <RiskCore score={score} level={level} />

      {/* 2D Score & Breakdown */}
      <div className="flex-1 text-center sm:text-left">
        <div className="flex items-center justify-center sm:justify-start gap-2.5">
          <span className="text-3xl font-mono font-bold text-zinc-100">{score}</span>
          <span className="text-sm font-mono text-zinc-500">/ 100</span>
          <StatusBadge level={level} size="md" />
        </div>

        <div className="mt-2 text-xs text-zinc-400">
          Supervised Decision: <span className="font-mono text-zinc-200">0.6×Rules ({rulesScore}) + 0.4×ML ({mlScore})</span>
        </div>

        <div className="mt-2 flex items-center justify-center sm:justify-start gap-4 text-[11px] font-mono text-zinc-500">
          <span>Confidence: <strong className="text-teal-400">{confidence}%</strong></span>
          <span>•</span>
          <span>Decision: <strong className="text-zinc-300">Deterministic</strong></span>
        </div>
      </div>
    </div>
  );
};

export const RecommendationBanner: React.FC<{
  recommendation: 'AVOID' | 'PROCEED_WITH_CAUTION' | 'SAFE_TO_PROCEED';
  text: string;
}> = ({ recommendation, text }) => {
  const isAvoid = recommendation === 'AVOID';
  const isCaution = recommendation === 'PROCEED_WITH_CAUTION';

  return (
    <div
      className={`p-4 rounded-lg border flex items-start space-x-3 ${
        isAvoid
          ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
          : isCaution
            ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
            : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
      }`}
    >
      {isAvoid ? (
        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
      ) : isCaution ? (
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
      ) : (
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
      )}
      <div>
        <div className="text-xs font-mono font-bold uppercase tracking-wider">
          RECOMMENDATION: {recommendation.replace(/_/g, ' ')}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-zinc-300">{text}</p>
      </div>
    </div>
  );
};

export const ReasonList: React.FC<{ reasons: ReasonItem[] }> = ({ reasons }) => {
  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630]">
      <h3 className="text-xs font-semibold text-zinc-200 mb-3 flex items-center justify-between">
        <span>Explainable Risk Contributions</span>
        <span className="text-[11px] font-mono text-zinc-500">Point breakdown</span>
      </h3>
      <div className="space-y-2">
        {reasons.map((reason) => (
          <div
            key={reason.id}
            className="p-2.5 rounded bg-[#0E131A] border border-[#1F2630] flex items-center justify-between text-xs"
          >
            <div className="flex items-center space-x-2.5 pr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
              <span className="text-zinc-300">{reason.description}</span>
            </div>
            <span
              className={`font-mono text-xs font-bold shrink-0 ${
                reason.points > 20
                  ? 'text-rose-400'
                  : reason.points > 10
                    ? 'text-orange-400'
                    : 'text-amber-400'
              }`}
            >
              +{reason.points} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const IntentCard: React.FC<{
  intent: IntentSummary;
  explainSimply: boolean;
  language: 'en' | 'hinglish';
}> = ({ intent, explainSimply, language }) => {
  const displayExplanation = explainSimply
    ? intent.plainSimple
    : language === 'hinglish'
      ? intent.plainHinglish
      : intent.plainEnglish;

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-zinc-200">Decoded Intent Analysis</h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161D26] text-teal-400 border border-teal-800/50">
          {intent.actionType}
        </span>
      </div>

      <div className="p-3 rounded bg-[#0E131A] border border-[#1F2630] text-xs text-zinc-200 leading-relaxed font-mono">
        {displayExplanation}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
        <div className="p-2 rounded bg-[#161D26] border border-[#1F2630]">
          <span className="text-[10px] text-zinc-500 font-mono block">SPENDER / OPERATOR</span>
          <span className="font-mono text-zinc-200 truncate block">
            {shortenAddress(intent.targetSpender, 6, 4)}
          </span>
        </div>
        <div className="p-2 rounded bg-[#161D26] border border-[#1F2630]">
          <span className="text-[10px] text-zinc-500 font-mono block">ASSET / SCOPE</span>
          <span className="font-mono text-zinc-200 truncate block">{intent.assetName}</span>
        </div>
        <div className="p-2 rounded bg-[#161D26] border border-[#1F2630] col-span-2 sm:col-span-1">
          <span className="text-[10px] text-zinc-500 font-mono block">ALLOWANCE LEVEL</span>
          <span className={`font-mono font-semibold ${intent.isUnlimited ? 'text-rose-400' : 'text-emerald-400'}`}>
            {intent.isUnlimited ? 'UNLIMITED' : intent.amountOrScope}
          </span>
        </div>
      </div>
    </div>
  );
};

export const MismatchCard: React.FC<{ mismatch: IntentMismatch }> = ({ mismatch }) => {
  return (
    <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-800/60">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-semibold text-rose-300">
            Claim-vs-Reality Mismatch ({mismatch.mismatchScore}/100)
          </h3>
        </div>
        <StatusBadge level={mismatch.severity} size="sm" />
      </div>

      <p className="text-xs text-zinc-300 leading-relaxed mb-3">{mismatch.explanation}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-2.5 rounded bg-[#0E131A] border border-[#1F2630]">
          <span className="text-[10px] font-mono text-zinc-500 block uppercase">PAGE / BUTTON CLAIM</span>
          <span className="font-mono text-amber-300 font-semibold block mt-1">"{mismatch.claimedText}"</span>
          <span className="text-[11px] text-zinc-400 block mt-0.5">{mismatch.expectedAction}</span>
        </div>

        <div className="p-2.5 rounded bg-[#0E131A] border border-rose-900/60">
          <span className="text-[10px] font-mono text-rose-400 block uppercase">ACTUAL TRANSACTION CALLDATA</span>
          <span className="font-mono text-rose-300 font-semibold block mt-1">{mismatch.actualAction}</span>
          <span className="text-[11px] text-zinc-400 block mt-0.5">Executes on-chain via user signature</span>
        </div>
      </div>
    </div>
  );
};

export const CounterfactualCard: React.FC<{ counterfactual: CounterfactualResult }> = ({
  counterfactual,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCalldata = () => {
    if (counterfactual.saferTxCalldata) {
      navigator.clipboard.writeText(counterfactual.saferTxCalldata);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-4 rounded-lg bg-[#11161D] border border-teal-800/40">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-zinc-200">Counterfactual Risk Mitigation</h3>
        <div className="flex items-center space-x-1.5 font-mono text-xs">
          <span className="text-rose-400 font-bold">{counterfactual.originalScore}</span>
          <ArrowRight className="w-3 h-3 text-zinc-500" />
          <span className="text-emerald-400 font-bold">{counterfactual.newScore}</span>
          <span className="text-[10px] text-emerald-400">({counterfactual.delta} pts)</span>
        </div>
      </div>

      <p className="text-xs text-zinc-300 leading-relaxed mb-3">{counterfactual.explanation}</p>

      {counterfactual.saferTxCalldata && (
        <div className="p-3 rounded bg-[#0E131A] border border-[#1F2630] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono text-teal-400 block font-semibold">
              SAFER APPROVAL CALLEDATA ({counterfactual.cappedAmountText || 'Capped Amount'})
            </span>
            <span className="text-[11px] font-mono text-zinc-400 truncate block max-w-sm">
              {counterfactual.saferTxCalldata.slice(0, 32)}...
            </span>
          </div>
          <button
            onClick={handleCopyCalldata}
            className="px-3 py-1.5 rounded text-xs font-mono bg-teal-950 text-teal-300 border border-teal-700 hover:bg-teal-900 transition-colors flex items-center space-x-1.5 shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Calldata' : 'Copy Safer Calldata'}</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const ContractAnalysisView: React.FC<{
  scan: ContractScanResult;
  navigate: (route: string) => void;
}> = ({ scan, navigate }) => {
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({
    ...Object.fromEntries(
      scan.findings
        .filter((f) => f.severity === 'CRITICAL' || f.severity === 'HIGH')
        .map((f) => [f.id, true])
    ),
  });
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedEvidence, setCopiedEvidence] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  const toggleFinding = (id: string) => {
    setExpandedFindings((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(scan.target);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  const handleCopyEvidenceHash = () => {
    if (scan.evidence?.canonicalHash) {
      navigator.clipboard.writeText(scan.evidence.canonicalHash);
      setCopiedEvidence(true);
      setTimeout(() => setCopiedEvidence(false), 2000);
    }
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(scan, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chainshield-contract-scan-${scan.target.slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const criticalCount = scan.findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = scan.findings.filter((f) => f.severity === 'HIGH').length;
  const cautionCount = scan.findings.filter((f) => f.severity === 'CAUTION').length;
  const infoCount = scan.findings.filter((f) => f.severity === 'LOW' || f.severity === 'INFO').length;

  const explorerBase =
    scan.chainId === 11155111 ? 'https://sepolia.etherscan.io' : 'https://etherscan.io';

  return (
    <div className="space-y-4">
      {/* 1. Source Provenance & Contract Metadata Card */}
      <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-zinc-100">
                {scan.sourceMetadata.contractName}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                {scan.networkName} ({scan.chainId})
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${scan.isDemo ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-cyan-950 text-cyan-300 border border-cyan-800'}`}>
                {scan.isDemo ? 'FIXTURE DATA' : 'LIVE RPC SCAN'}
              </span>
              {scan.sourceMetadata.verificationStatus === 'VERIFIED' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Verified Source</span>
                </span>
              ) : scan.status === 'NO_CONTRACT_CODE' ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950 text-rose-300 border border-rose-800">
                  No Bytecode (EOA)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Unverified Source</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2 mt-1">
              <span className="text-xs font-mono text-teal-400">{scan.target}</span>
              <button
                onClick={handleCopyAddress}
                title="Copy Address"
                className="text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                {copiedAddr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <a
                href={`${explorerBase}/address/${scan.target}`}
                target="_blank"
                rel="noreferrer"
                title="View on Explorer"
                className="text-zinc-400 hover:text-teal-400 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleExportJson}
              className="px-3 py-1.5 rounded text-xs font-mono bg-[#161D26] text-zinc-300 border border-[#1F2630] hover:border-zinc-500 transition-colors flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{copiedReport ? 'Exported' : 'Export JSON'}</span>
            </button>
          </div>
        </div>

        {/* Provenance Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
          <div className="p-2 rounded bg-[#0E131A] border border-[#1F2630]">
            <span className="text-[10px] text-zinc-500 block">SOURCE PROVIDER</span>
            <span className="text-zinc-300 font-semibold uppercase">
              {scan.sourceMetadata.sourceProvider}
            </span>
          </div>
          <div className="p-2 rounded bg-[#0E131A] border border-[#1F2630]">
            <span className="text-[10px] text-zinc-500 block">COMPILER VERSION</span>
            <span className="text-zinc-300 font-semibold truncate block">
              {scan.sourceMetadata.compilerVersion}
            </span>
          </div>
          <div className="p-2 rounded bg-[#0E131A] border border-[#1F2630]">
            <span className="text-[10px] text-zinc-500 block">OPTIMIZATION</span>
            <span className="text-zinc-300 font-semibold">
              {scan.sourceMetadata.optimizationUsed
                ? `Runs (${scan.sourceMetadata.runs ?? 200})`
                : 'Disabled'}
            </span>
          </div>
          <div className="p-2 rounded bg-[#0E131A] border border-[#1F2630]">
            <span className="text-[10px] text-zinc-500 block">BYTECODE SIZE</span>
            <span className="text-zinc-300 font-semibold">
              {scan.sourceMetadata.bytecodeSize.toLocaleString()} bytes
            </span>
          </div>
          <div className="p-2 rounded bg-[#0E131A] border border-[#1F2630]">
            <span className="text-[10px] text-zinc-500 block">STATIC AST STATUS</span>
            <span className={`font-semibold ${
              scan.staticAnalysisStatus === 'SKIPPED' || scan.status === 'UNVERIFIED_SOURCE'
                ? 'text-amber-400'
                : scan.staticAnalysisStatus === 'UNAVAILABLE' || scan.status === 'NO_CONTRACT_CODE'
                ? 'text-zinc-400'
                : 'text-emerald-400'
            }`}>
              {scan.staticAnalysisStatus || (scan.status === 'UNVERIFIED_SOURCE' ? 'SKIPPED' : 'ANALYZED')}
            </span>
          </div>
        </div>

        {/* Proxy Architecture Banner (Rule F) */}
        {scan.sourceMetadata.isProxy && (
          <div className="p-3 rounded bg-teal-950/20 border border-teal-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="space-y-0.5">
              <span className="font-semibold text-teal-300 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>Upgradeable Proxy ({scan.sourceMetadata.proxyType || 'EIP-1967'})</span>
              </span>
              <p className="text-[11px] text-zinc-400 font-mono">
                Implementation Address:{' '}
                <strong className="text-zinc-200">
                  {scan.sourceMetadata.implementationAddress || 'Unresolved'}
                </strong>
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono self-start sm:self-auto border ${
                scan.sourceMetadata.implementationVerified
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border-amber-800'
              }`}
            >
              {scan.sourceMetadata.implementationVerified
                ? 'Implementation Verified'
                : 'Implementation Unverified'}
            </span>
          </div>
        )}
      </div>

      {/* 2. Deterministic Risk Gauge & Severity Counters */}
      <ScoreGauge
        score={scan.riskScore}
        level={scan.riskLevel}
        confidence={scan.confidence}
        rulesScore={scan.rulesScore}
        mlScore={scan.mlScore}
      />

      {/* Severity Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/40 flex items-center justify-between">
          <span className="text-rose-400 font-semibold">Critical Vulnerabilities</span>
          <span className="text-rose-300 font-bold text-sm">{criticalCount}</span>
        </div>
        <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/40 flex items-center justify-between">
          <span className="text-amber-400 font-semibold">High Severity</span>
          <span className="text-amber-300 font-bold text-sm">{highCount}</span>
        </div>
        <div className="p-2.5 rounded bg-yellow-950/20 border border-yellow-900/40 flex items-center justify-between">
          <span className="text-yellow-400 font-semibold">Cautionary Flags</span>
          <span className="text-yellow-300 font-bold text-sm">{cautionCount}</span>
        </div>
        <div className="p-2.5 rounded bg-[#161D26] border border-[#1F2630] flex items-center justify-between">
          <span className="text-zinc-400 font-semibold">Informational Notes</span>
          <span className="text-zinc-300 font-bold text-sm">{infoCount}</span>
        </div>
      </div>

      {/* Recommendation Banner */}
      <RecommendationBanner
        recommendation={scan.recommendation}
        text={scan.recommendationText}
      />

      {/* 3. Reason Points Contribution */}
      <ReasonList reasons={scan.reasons} />

      {/* 4. Evidence-Backed Security Findings List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-zinc-200">
            Static AST Security Findings ({scan.findings.length})
          </h3>
          <span className="text-[10px] font-mono text-zinc-500">
            {scan.staticAnalysisStatus === 'SKIPPED' || scan.status === 'UNVERIFIED_SOURCE'
              ? 'Source Unavailable — Static Analysis Skipped'
              : scan.staticAnalysisStatus === 'UNAVAILABLE' || scan.status === 'NO_CONTRACT_CODE'
              ? 'No Bytecode — Analysis Unavailable'
              : 'AST-Verified Source Code Locations'}
          </span>
        </div>

        {scan.staticAnalysisStatus === 'SKIPPED' || scan.status === 'UNVERIFIED_SOURCE' || scan.sourceMetadata.verificationStatus === 'UNVERIFIED' ? (
          <div className="p-4 rounded-lg bg-amber-950/20 border border-amber-900/50 flex items-start space-x-3 text-amber-300 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-2 w-full">
              <div>
                <span className="font-semibold block text-amber-200 text-sm">
                  Static AST Security Analysis Skipped — Verified Source Unavailable
                </span>
                <span className="text-zinc-300 text-xs block mt-1 leading-relaxed">
                  Zero static security findings does <strong className="text-amber-200">NOT</strong> indicate contract safety. Runtime bytecode exists on-chain, but verified Solidity source code could not be retrieved from public registries (Sourcify API v2 or Etherscan API V2).
                </span>
              </div>

              {scan.sourceMetadata.retrievalDiagnostic && (
                <div className="p-2.5 rounded bg-[#0E131A] border border-amber-900/40 text-[11px] font-mono text-zinc-300 space-y-1">
                  <span className="text-amber-400 font-semibold block">Provider Retrieval Diagnostics:</span>
                  <p className="text-zinc-400 break-words">{scan.sourceMetadata.retrievalDiagnostic}</p>
                </div>
              )}

              <div className="text-zinc-400 text-[11px] bg-amber-950/30 p-2 rounded border border-amber-900/30">
                <strong className="text-amber-300">Policy Note:</strong> The assigned risk score ({scan.riskScore}/100) reflects verification uncertainty and lack of auditability rather than a confirmed vulnerability in verified source.
              </div>
            </div>
          </div>
        ) : scan.status === 'NO_CONTRACT_CODE' || scan.staticAnalysisStatus === 'UNAVAILABLE' ? (
          <div className="p-4 rounded-lg bg-[#11161D] border border-zinc-800 flex items-start space-x-3 text-zinc-300 text-xs">
            <Info className="w-5 h-5 shrink-0 text-zinc-400 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold block text-zinc-200">
                Static Analysis Unavailable — No Contract Code
              </span>
              <span className="text-zinc-400 text-[11px] block">
                Target address has 0 bytes of deployed runtime bytecode (EOA or undeployed address). No static contract analysis could be performed.
              </span>
            </div>
          </div>
        ) : scan.findings.length === 0 ? (
          <div className="p-5 rounded-lg bg-[#11161D] border border-emerald-900/40 flex items-center space-x-3 text-emerald-300 text-xs">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <div>
              <span className="font-semibold block">All Static Security Checks Passed</span>
              <span className="text-zinc-400 text-[11px] block mt-0.5">
                No unauthorized minting functions, unprotected privilege operations, or dangerous calls detected in verified source code ({scan.sourceMetadata.sourceFiles.length} file(s) analyzed).
              </span>
            </div>
          </div>
        ) : (
          scan.findings.map((finding) => {
            const isExpanded = expandedFindings[finding.id];
            const severityColor =
              finding.severity === 'CRITICAL'
                ? 'bg-rose-950/40 text-rose-300 border-rose-800'
                : finding.severity === 'HIGH'
                ? 'bg-amber-950/40 text-amber-300 border-amber-800'
                : finding.severity === 'CAUTION'
                ? 'bg-yellow-950/30 text-yellow-300 border-yellow-800'
                : 'bg-zinc-800/60 text-zinc-300 border-zinc-700';

            return (
              <div
                key={finding.id}
                className="rounded-lg bg-[#11161D] border border-[#1F2630] overflow-hidden"
              >
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => toggleFinding(finding.id)}
                  className="w-full p-3.5 flex items-start justify-between text-left hover:bg-[#161D26]/60 transition-colors gap-3"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${severityColor}`}>
                        {finding.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#161D26] text-zinc-400 border border-[#1F2630]">
                        {finding.ruleId}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950/40 text-teal-300 border border-teal-800/60">
                        {finding.confidence} CONFIDENCE
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        +{finding.scoreContribution} pts
                      </span>
                    </div>

                    <h4 className="text-xs font-semibold text-zinc-100 mt-1">
                      {finding.title}
                    </h4>

                    <div className="text-[11px] font-mono text-teal-400">
                      Function: {finding.affectedFunction} • {finding.sourceFile}:{finding.lineStart}-{finding.lineEnd}
                    </div>
                  </div>

                  <div className="shrink-0 text-zinc-400 mt-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="p-4 border-t border-[#1F2630] space-y-3.5 text-xs bg-[#0E131A]/60">
                    {/* Source Code Excerpt */}
                    {finding.codeSnippet && (
                      <div>
                        <span className="text-[10px] font-mono text-zinc-400 block mb-1">
                          SOURCE CODE LOCATION ({finding.sourceFile}:{finding.lineStart})
                        </span>
                        <pre className="p-3 rounded bg-[#090D12] border border-[#1F2630] text-[11px] font-mono text-zinc-300 overflow-x-auto leading-relaxed">
                          <code>{finding.codeSnippet}</code>
                        </pre>
                      </div>
                    )}

                    {/* Explanation */}
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 block mb-0.5">
                        EXPLANATION
                      </span>
                      <p className="text-zinc-300 leading-relaxed">{finding.description}</p>
                    </div>

                    {/* Potential Impact */}
                    <div>
                      <span className="text-[10px] font-mono text-rose-400 block mb-0.5 font-semibold">
                        POTENTIAL IMPACT
                      </span>
                      <p className="text-rose-200/90 leading-relaxed p-2.5 rounded bg-rose-950/20 border border-rose-900/40">
                        {finding.potentialImpact}
                      </p>
                    </div>

                    {/* Remediation Guidance */}
                    <div>
                      <span className="text-[10px] font-mono text-teal-400 block mb-1 font-semibold">
                        RECOMMENDED REMEDIATION
                      </span>
                      <pre className="p-3 rounded bg-[#161D26] border border-teal-900/50 text-[11px] font-mono text-teal-200 whitespace-pre-wrap leading-relaxed">
                        {finding.remediation}
                      </pre>
                    </div>

                    {/* Reasoning & Limitations */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-zinc-400">
                      <div>
                        <strong className="text-zinc-300 block mb-0.5">Static Analysis Reasoning:</strong>
                        <span>{finding.reasoning}</span>
                      </div>
                      {finding.limitations && (
                        <div>
                          <strong className="text-zinc-300 block mb-0.5">Analysis Limitations:</strong>
                          <span>{finding.limitations}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. Sepolia Evidence Anchoring Section */}
      {scan.evidence && (
        <div className="p-4 rounded-lg bg-[#0E131A] border border-teal-800/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-teal-400" />
              <span className="text-xs font-semibold text-zinc-200">
                Cryptographic Evidence Hash Generated
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-teal-950 text-teal-300 rounded border border-teal-800">
                {scan.evidence.reportId}
              </span>
            </div>
            <div className="text-[11px] font-mono text-zinc-400 mt-1 truncate max-w-md">
              SHA-256: {scan.evidence.canonicalHash}
            </div>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCopyEvidenceHash}
              className="px-3 py-1.5 rounded text-xs font-mono bg-[#161D26] text-zinc-200 border border-[#1F2630] hover:border-zinc-600 transition-colors flex items-center space-x-1"
            >
              {copiedEvidence ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEvidence ? 'Copied' : 'Copy Hash'}</span>
            </button>
            <button
              onClick={() => navigate(`/verify?reportId=${scan.evidence?.reportId}`)}
              className="px-3 py-1.5 rounded text-xs font-mono bg-teal-950 text-teal-300 border border-teal-700 hover:bg-teal-900 transition-colors flex items-center space-x-1"
            >
              <span>Anchor on Sepolia</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

