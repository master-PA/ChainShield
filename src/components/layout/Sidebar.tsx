import React from 'react';
import {
  LayoutDashboard,
  Scan,
  Activity,
  FileText,
  History,
  Users,
  CheckCircle2,
  Bell,
  Binary,
  Code2,
  Puzzle,
  Settings,
  Home,
  Headphones,
  Database,
  X,
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

interface SidebarProps {
  currentRoute: string;
  navigate: (route: string) => void;
  open?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, navigate, open = false, onClose }) => {
  const { isDemoDataset, toggleDemoDataset, tripwireAlerts, setChatOpen, chatOpen } = useSecurity();

  const groups = [
    {
      title: 'Protect',
      items: [
        { label: 'Dashboard', route: '/dashboard', icon: LayoutDashboard },
        { label: 'Scanner', route: '/scanner', icon: Scan },
        { label: 'Wallet Health', route: '/wallet-health', icon: Activity },
        {
          label: 'Alerts',
          route: '/alerts',
          icon: Bell,
          badge: tripwireAlerts.length > 0 ? tripwireAlerts.length : undefined,
        },
      ],
    },
    {
      title: 'Evidence',
      items: [
        { label: 'Security Reports', route: '/reports', icon: FileText },
        { label: 'Scan History', route: '/history', icon: History },
        { label: 'Evidence Verification', route: '/verify', icon: CheckCircle2 },
      ],
    },
    {
      title: 'Intel & tools',
      items: [
        { label: 'Community Intel', route: '/community', icon: Users },
        { label: 'Drainer Kits', route: '/drainer-kits', icon: Binary },
        { label: 'Developers', route: '/developers', icon: Code2 },
        { label: 'Extension', route: '/extension', icon: Puzzle },
      ],
    },
  ];

  return (
    <>
      {/* mobile scrim */}
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-30 bg-[#13211A]/30 backdrop-blur-[2px] lg:hidden transition-opacity ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      <aside
        className={`w-64 bg-[#11161D] border-r border-[#1F2630] flex flex-col justify-between h-screen fixed left-0 top-0 z-40 select-none transition-transform duration-300 ease-out lg:translate-x-0 ${
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="min-h-0 flex flex-col">
          {/* Brand */}
          <div className="h-16 px-4 border-b border-[#1F2630] flex items-center justify-between shrink-0">
            <button onClick={() => navigate('/')} className="flex items-center gap-2.5 group text-left" aria-label="ChainShield home">
              <span className="w-9 h-9 rounded-[11px] bg-gradient-to-br from-[#2E8B63] to-[#165A3D] grid place-items-center shadow-[0_6px_16px_-6px_rgba(22,90,61,.5)]">
                <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
                  <path d="M12 2.5l7.5 3v6c0 4.6-3.1 8.6-7.5 10-4.4-1.4-7.5-5.4-7.5-10v-6l7.5-3z" fill="#fff" />
                  <path d="M8.6 12.2l2.3 2.3 4.5-4.7" stroke="#165A3D" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="leading-tight">
                <span className="block text-[15px] font-extrabold tracking-tight text-zinc-100">
                  ChainShield <span className="font-medium text-zinc-500">Sentinel</span>
                </span>
                <span className="block text-[10px] font-mono text-zinc-500 tracking-wide">v2.4 · Pre-transaction</span>
              </span>
            </button>
            <button onClick={onClose} className="lg:hidden p-1.5 rounded-md text-zinc-500 hover:bg-[#161D26]" aria-label="Close menu">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Demo dataset chip */}
          {isDemoDataset && (
            <div className="mx-3 mt-3 px-3 py-2 bg-teal-950 rounded-lg border border-teal-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-teal-400" />
                <span className="text-[11px] font-mono text-teal-300">Demo dataset</span>
              </div>
              <button
                onClick={toggleDemoDataset}
                title="Toggle demo / live view"
                className="text-[10px] font-mono text-teal-400 hover:text-teal-300 underline underline-offset-2"
              >
                Toggle
              </button>
            </div>
          )}

          {/* Navigation */}
          <nav className="px-3 py-3 overflow-y-auto space-y-4" aria-label="Main">
            <button
              onClick={() => navigate('/')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                currentRoute === '/' ? 'bg-teal-950 text-teal-300' : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#161D26]'
              }`}
            >
              <Home className="w-4 h-4 text-zinc-500" />
              Home
            </button>

            {groups.map((g) => (
              <div key={g.title}>
                <div className="px-3 mb-1.5 text-[10px] font-mono uppercase tracking-[0.14em] text-zinc-500">{g.title}</div>
                <div className="space-y-0.5">
                  {g.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentRoute === item.route;
                    return (
                      <button
                        key={item.route}
                        onClick={() => navigate(item.route)}
                        aria-current={isActive ? 'page' : undefined}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-full text-[13px] font-semibold transition-colors ${
                          isActive ? 'bg-teal-950 text-teal-300' : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#161D26]'
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isActive ? 'text-teal-500' : 'text-zinc-500'}`} />
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="min-w-5 px-1.5 text-[10px] font-mono bg-rose-950 text-rose-300 rounded-full border border-rose-800 text-center">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#1F2630] space-y-2 shrink-0 bg-[#0E131A]">
          <button
            onClick={() => navigate('/settings')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-full text-[13px] font-semibold transition-colors ${
              currentRoute === '/settings' ? 'bg-teal-950 text-teal-300' : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#161D26]'
            }`}
          >
            <Settings className="w-4 h-4 text-zinc-500" />
            Settings
          </button>

          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              chatOpen ? 'bg-teal-950 text-teal-300 border-teal-800' : 'bg-[#11161D] text-zinc-300 border-[#1F2630] hover:border-teal-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Headphones className="w-3.5 h-3.5 text-teal-500" />
              Sentinel Support
            </span>
            <span className="text-[10px] font-mono text-zinc-500">200+ KB</span>
          </button>

          <div className="px-3 py-1.5 rounded-full bg-[#11161D] border border-[#1F2630] flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              EVM Sepolia
            </span>
            <span className="text-zinc-500">#5410982</span>
          </div>
        </div>
      </aside>
    </>
  );
};
