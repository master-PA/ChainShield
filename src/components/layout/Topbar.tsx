import React, { useState } from 'react';
import { Search, Globe2, HelpCircle, Headphones, Sparkles, AlertCircle } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

interface TopbarProps {
  navigate: (route: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ navigate }) => {
  const {
    language,
    toggleLanguage,
    explainSimply,
    toggleExplainSimply,
    chatOpen,
    setChatOpen,
    isDemoDataset,
    runTargetScan,
  } = useSecurity();

  const [searchVal, setSearchVal] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    runTargetScan(searchVal.trim());
    navigate(`/scanner?target=${encodeURIComponent(searchVal.trim())}`);
    setSearchVal('');
  };

  return (
    <header className="h-14 bg-[#11161D] border-b border-[#1F2630] fixed top-0 right-0 left-64 z-20 flex items-center justify-between px-6 select-none">
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Pre-scan target (e.g. mintzone-nft.xyz, 0xAbc9...)"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-[#161D26] border border-[#1F2630] rounded-md pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-teal-500 font-mono transition-colors"
          />
        </div>
      </form>

      {/* Controls */}
      <div className="flex items-center space-x-3">
        {/* Demo Indicator */}
        {isDemoDataset && (
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950/80 text-teal-300 border border-teal-800">
            Demo dataset
          </span>
        )}

        {/* Explain Simply Toggle */}
        <button
          onClick={toggleExplainSimply}
          title="Toggle simplified plain language mode"
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
            explainSimply
              ? 'bg-teal-950 text-teal-300 border-teal-700'
              : 'bg-[#161D26] text-zinc-400 border-[#1F2630] hover:text-zinc-200'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Explain simply</span>
          <span className="text-[10px] font-mono uppercase">{explainSimply ? 'ON' : 'OFF'}</span>
        </button>

        {/* Language Switch */}
        <button
          onClick={toggleLanguage}
          title="Switch language between English and Hinglish"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs bg-[#161D26] border border-[#1F2630] text-zinc-300 hover:border-zinc-700 transition-colors"
        >
          <Globe2 className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-mono text-[11px] uppercase">{language === 'en' ? 'EN' : 'HINGLISH'}</span>
        </button>

        {/* Support Chatbot trigger */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs border transition-colors ${
            chatOpen
              ? 'bg-teal-950 text-teal-300 border-teal-700'
              : 'bg-[#161D26] text-zinc-300 border-[#1F2630] hover:border-zinc-700'
          }`}
        >
          <Headphones className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">Support</span>
        </button>
      </div>
    </header>
  );
};
