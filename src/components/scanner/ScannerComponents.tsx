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
