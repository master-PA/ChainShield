import React, { useState } from 'react';
import { Search, Globe2, HelpCircle, Headphones, Menu } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

interface TopbarProps {
  navigate: (route: string) => void;
  onMenu?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ navigate, onMenu }) => {
  const { language, toggleLanguage, explainSimply, toggleExplainSimply, chatOpen, setChatOpen, isDemoDataset, runTargetScan } =
    useSecurity();

  const [searchVal, setSearchVal] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchVal.trim()) return;
    runTargetScan(searchVal.trim());
    navigate(`/scanner?target=${encodeURIComponent(searchVal.trim())}`);
    setSearchVal('');
  };

  const pill = (active: boolean) =>
    `flex items-center gap-1.5 h-9 px-3.5 rounded-full text-xs font-semibold border transition-colors ${
      active ? 'bg-teal-950 text-teal-300 border-teal-800' : 'bg-[#11161D] text-zinc-400 border-[#1F2630] hover:text-zinc-100 hover:border-teal-700'
    }`;

  return (
    <header className="h-16 bg-[#F5F7F5]/85 backdrop-blur-xl border-b border-[#1F2630] fixed top-0 right-0 left-0 lg:left-64 z-20 flex items-center gap-3 px-4 sm:px-6 lg:px-8 select-none">
      <button
        onClick={onMenu}
        className="lg:hidden w-10 h-10 grid place-items-center rounded-[11px] bg-[#11161D] border border-[#1F2630] text-zinc-300"
        aria-label="Open menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl" role="search">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Pre-scan a target"
            placeholder="Pre-scan a target — mintzone-nft.xyz, 0xAbc9…"
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full h-10 bg-[#11161D] border border-[#1F2630] rounded-full pl-10 pr-4 text-xs text-zinc-200 focus:outline-none focus:border-teal-500 font-mono transition-colors"
          />
        </div>
      </form>

      {/* Controls */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="hidden xl:inline-flex items-center gap-2 h-9 px-3.5 rounded-full bg-[#11161D] border border-[#1F2630] font-mono text-[11px] text-teal-400">
          <span className="w-[7px] h-[7px] rounded-full bg-teal-500 shadow-[0_0_0_3px_rgba(34,122,85,.18)] animate-pulse" />
          Shield ready
        </span>

        {isDemoDataset && (
          <span className="hidden md:inline-flex items-center h-9 px-3.5 rounded-full text-[11px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
            Demo dataset
          </span>
        )}

        <button onClick={toggleExplainSimply} title="Toggle simplified plain-language mode" className={pill(explainSimply)} aria-pressed={explainSimply}>
          <HelpCircle className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Explain simply</span>
          <span className="text-[10px] font-mono uppercase">{explainSimply ? 'On' : 'Off'}</span>
        </button>

        <button onClick={toggleLanguage} title="Switch language between English and Hinglish" className={pill(false)}>
          <Globe2 className="w-3.5 h-3.5 text-zinc-500" />
          <span className="font-mono text-[11px] uppercase">{language === 'en' ? 'EN' : 'Hinglish'}</span>
        </button>

        <button onClick={() => setChatOpen(!chatOpen)} className={pill(chatOpen)} aria-pressed={chatOpen}>
          <Headphones className="w-3.5 h-3.5 text-teal-500" />
          <span className="hidden sm:inline">Support</span>
        </button>
      </div>
    </header>
  );
};
