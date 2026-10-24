import React, { useState } from 'react';
import {
  Users,
  ThumbsUp,
  Award,
  ShieldAlert,
  Send,
  Plus,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';
import { formatTimeAgo, shortenAddress } from '../lib/formatters';

export const Community: React.FC<{ navigate: (route: string) => void }> = ({ navigate }) => {
  const { communityReports, submitCommunityReport, upvoteReport, isDemoDataset } = useSecurity();
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [target, setTarget] = useState('');
  const [category, setCategory] = useState('Inferno Drainer Clone');
  const [description, setDescription] = useState('');
  const [stakeEth, setStakeEth] = useState('0.05');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim() || !description.trim()) return;
    await submitCommunityReport(target.trim(), category, description.trim(), stakeEth);
    setShowSubmitModal(false);
    setTarget('');
    setDescription('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-zinc-100">Community Threat Intelligence & Staking</h1>
            {isDemoDataset && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                Demo dataset
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Decentralized threat reporting with testnet staking incentives on ReporterStaking.sol
          </p>
        </div>

        <button
          onClick={() => setShowSubmitModal(true)}
          className="px-4 py-2 rounded bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs flex items-center space-x-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Submit Threat Report</span>
        </button>
      </div>

      {/* Community Staking Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630]">
          <span className="text-xs text-zinc-400">Total Testnet Stake Pooled</span>
          <div className="text-2xl font-mono font-bold text-teal-400 mt-2">14.85 ETH</div>
          <span className="text-[10px] text-zinc-500 mt-1 block">In ReporterStaking contract</span>
        </div>

        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630]">
          <span className="text-xs text-zinc-400">Consensus Accuracy Rate</span>
          <div className="text-2xl font-mono font-bold text-emerald-400 mt-2">97.4%</div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Weighted by reporter reputation</span>
        </div>

        <div className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630]">
          <span className="text-xs text-zinc-400">Slashed Spam Reports</span>
          <div className="text-2xl font-mono font-bold text-rose-400 mt-2">18</div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Stake burned on false flags</span>
        </div>
      </div>

      {/* Reports Feed */}
      <div className="space-y-3">
        <h2 className="text-xs font-semibold text-zinc-200">
          Recent Community Submissions ({communityReports.length})
        </h2>

        {communityReports.map((report) => (
          <div
            key={report.id}
            className="p-4 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-zinc-200 font-mono">
                  {report.target}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161D26] text-amber-300 border border-[#1F2630]">
                  {report.reportedCategory}
                </span>
              </div>
              <span className="text-xs font-mono text-zinc-500">
                {formatTimeAgo(report.timestamp)}
              </span>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">{report.description}</p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[#1F2630] text-xs">
              <div className="flex items-center space-x-3 font-mono text-zinc-400 text-[11px]">
                <span>Reporter: {report.reporterAddress}</span>
                <span>•</span>
                <span className="text-teal-400 font-semibold">{report.reporterReputation} REP</span>
                {report.stakeAmountEth && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400">Staked: {report.stakeAmountEth} ETH</span>
                  </>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => upvoteReport(report.id)}
                  className="px-2.5 py-1 rounded bg-[#161D26] hover:bg-[#1F2634] border border-[#1F2630] text-zinc-200 text-xs font-mono flex items-center space-x-1.5 transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-teal-400" />
                  <span>Upvote ({report.upvotes})</span>
                </button>
                <button
                  onClick={() => navigate(`/verify?hash=${report.evidenceHash}`)}
                  className="text-[11px] font-mono text-teal-400 hover:underline flex items-center gap-1"
                >
                  <span>Verify Evidence</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Submit Report Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSubmit}
            className="bg-[#11161D] border border-[#1F2630] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#1F2630] pb-2">
              <h3 className="text-sm font-semibold text-zinc-100">Submit Community Threat Report</h3>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-xs font-mono"
              >
                ✕ Close
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Target URL or Contract Address
              </label>
              <input
                type="text"
                required
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. mintzone-nft.xyz or 0x9918..."
                className="w-full bg-[#161D26] border border-[#1F2630] rounded-md px-3 py-2 text-xs font-mono text-zinc-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Threat Classification
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#161D26] border border-[#1F2630] rounded-md px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-teal-500"
              >
                <option value="Inferno Drainer Clone">Inferno Drainer Clone</option>
                <option value="Angel Drainer SaaS">Angel Drainer SaaS</option>
                <option value="Honeypot Token">Honeypot Token</option>
                <option value="Seed Phrase Phishing">Seed Phrase Phishing</option>
                <option value="Discord Bot Impersonator">Discord Bot Impersonator</option>
                <option value="Proxy Malicious Upgrade">Proxy Malicious Upgrade</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Technical Evidence / Description
              </label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explain the observed attack vector or prompt..."
                className="w-full bg-[#161D26] border border-[#1F2630] rounded-md p-2.5 text-xs text-zinc-100 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-zinc-300 block mb-1">
                Optional Sepolia Stake (ETH)
              </label>
              <input
                type="text"
                value={stakeEth}
                onChange={(e) => setStakeEth(e.target.value)}
                className="w-full bg-[#161D26] border border-[#1F2630] rounded-md px-3 py-1.5 text-xs font-mono text-zinc-100 focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">
                Higher stake boosts priority and reporter reputation upon verification.
              </span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2 rounded text-xs bg-[#161D26] text-zinc-300 border border-[#1F2630]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded text-xs font-semibold bg-teal-500 hover:bg-teal-400 text-[#0B0F14]"
              >
                Sign & Submit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
