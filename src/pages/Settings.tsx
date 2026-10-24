import React, { useState } from 'react';
import { Settings as SettingsIcon, Globe2, HelpCircle, Server, Shield, Check } from 'lucide-react';
import { useSecurity } from '../context/SecurityContext';

export const Settings: React.FC = () => {
  const { language, toggleLanguage, explainSimply, toggleExplainSimply, isDemoDataset, toggleDemoDataset } =
    useSecurity();
  const [rpcUrl, setRpcUrl] = useState('https://rpc.sepolia.org');
  const [savedRpc, setSavedRpc] = useState(false);

  const handleSaveRpc = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedRpc(true);
    setTimeout(() => setSavedRpc(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-3xl">
      {/* Header */}
      <div className="border-b border-[#1F2630] pb-4">
        <h1 className="text-xl font-bold text-zinc-100">Platform Settings</h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Configure localization, plain explanation mode, blockchain RPCs, and data filters
        </p>
      </div>

      {/* User Interface & Language */}
      <div className="p-5 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-4">
        <h2 className="text-xs font-semibold text-zinc-200">Language & Plain Explanations</h2>

        <div className="flex items-center justify-between p-3 rounded bg-[#0E131A] border border-[#1F2630]">
          <div>
            <span className="text-xs font-medium text-zinc-200 block">Active Language</span>
            <span className="text-[11px] text-zinc-500">
              Toggle between Standard English and Hinglish (Hindi + English)
            </span>
          </div>
          <button
            onClick={toggleLanguage}
            className="px-3 py-1.5 rounded text-xs font-mono bg-[#161D26] hover:bg-[#1F2634] text-teal-400 border border-[#1F2630] transition-colors"
          >
            {language === 'en' ? 'ENGLISH (EN)' : 'HINGLISH (HI-EN)'}
          </button>
        </div>

        <div className="flex items-center justify-between p-3 rounded bg-[#0E131A] border border-[#1F2630]">
          <div>
            <span className="text-xs font-medium text-zinc-200 block">Explain Simply Mode</span>
            <span className="text-[11px] text-zinc-500">
              Translates complex EVM calldata into everyday non-technical summaries
            </span>
          </div>
          <button
            onClick={toggleExplainSimply}
            className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
              explainSimply
                ? 'bg-teal-950 text-teal-300 border-teal-700'
                : 'bg-[#161D26] text-zinc-400 border-[#1F2630]'
            }`}
          >
            {explainSimply ? 'ENABLED' : 'DISABLED'}
          </button>
        </div>

        <div className="flex items-center justify-between p-3 rounded bg-[#0E131A] border border-[#1F2630]">
          <div>
            <span className="text-xs font-medium text-zinc-200 block">Demo Dataset Active</span>
            <span className="text-[11px] text-zinc-500">
              Show curated case studies (Rohit's Telegram NFT, Priya's proxy alert)
            </span>
          </div>
          <button
            onClick={toggleDemoDataset}
            className={`px-3 py-1.5 rounded text-xs font-mono border transition-colors ${
              isDemoDataset
                ? 'bg-teal-950 text-teal-300 border-teal-700'
                : 'bg-[#161D26] text-zinc-400 border-[#1F2630]'
            }`}
          >
            {isDemoDataset ? 'ACTIVE' : 'LIVE ONLY'}
          </button>
        </div>
      </div>

      {/* Sepolia RPC Endpoint */}
      <form onSubmit={handleSaveRpc} className="p-5 rounded-lg bg-[#11161D] border border-[#1F2630] space-y-4">
        <h2 className="text-xs font-semibold text-zinc-200">Ethereum Sepolia RPC Node</h2>
        <div>
          <label className="text-[11px] font-mono text-zinc-400 block mb-1">
            RPC PROVIDER ENDPOINT (FOR EVIDENCE VERIFICATION)
          </label>
          <input
            type="text"
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            className="w-full bg-[#0E131A] border border-[#1F2630] rounded-md px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-teal-500"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 rounded bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs flex items-center space-x-1.5 transition-colors"
        >
          {savedRpc ? <Check className="w-3.5 h-3.5" /> : null}
          <span>{savedRpc ? 'Saved RPC Config' : 'Update RPC Endpoint'}</span>
        </button>
      </form>
    </div>
  );
};
