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
  Shield,
  Headphones,
  Database,
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

interface SidebarProps {
  currentRoute: string;
  navigate: (route: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentRoute, navigate }) => {
  const { isDemoDataset, toggleDemoDataset, tripwireAlerts, setChatOpen, chatOpen } = useSecurity();

  const navItems = [
    { label: 'Dashboard', route: '/', icon: LayoutDashboard },
    { label: 'Public Landing', route: '/landing', icon: Shield },
    { label: 'Scanner', route: '/scanner', icon: Scan },
    { label: 'Wallet Health', route: '/wallet-health', icon: Activity },
    { label: 'Security Reports', route: '/reports', icon: FileText },
    { label: 'Scan History', route: '/history', icon: History },
    { label: 'Community Intel', route: '/community', icon: Users },
    { label: 'Evidence Verification', route: '/verify', icon: CheckCircle2 },
    {
      label: 'Alerts',
      route: '/alerts',
      icon: Bell,
      badge: tripwireAlerts.length > 0 ? tripwireAlerts.length : undefined,
    },
    { label: 'Drainer Kits', route: '/drainer-kits', icon: Binary },
    { label: 'Developers', route: '/developers', icon: Code2 },
    { label: 'Extension', route: '/extension', icon: Puzzle },
    { label: 'Settings', route: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#11161D] border-r border-[#1F2630] flex flex-col justify-between h-screen fixed left-0 top-0 z-30 select-none">
      <div>
        {/* Brand Header */}
        <div
          onClick={() => navigate('/')}
          className="p-4 border-b border-[#1F2630] flex items-center justify-between cursor-pointer group"
        >
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-950/80 border border-teal-500/40 flex items-center justify-center text-teal-400 group-hover:border-teal-400 transition-colors">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-1.5">
                <span>ChainShield</span>
                <span className="text-[10px] font-mono px-1 py-0.2 bg-teal-950 text-teal-300 rounded border border-teal-800">
                  v2.4
                </span>
              </div>
              <div className="text-[11px] text-zinc-400">Sentinel Security</div>
            </div>
          </div>
        </div>

        {/* Demo Dataset Chip (Rule 3) */}
        {isDemoDataset && (
          <div className="mx-3 mt-3 p-2 bg-[#161D26] rounded-md border border-[#1F2630] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-mono text-zinc-300">Demo dataset active</span>
            </div>
            <button
              onClick={toggleDemoDataset}
              title="Toggle demo / live view"
              className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 underline"
            >
              Toggle
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-250px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.route;
            return (
              <button
                key={item.route}
                onClick={() => navigate(item.route)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-950/50 text-teal-300 border border-teal-800/60'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#161D26]'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-1.5 py-0.2 text-[10px] font-mono bg-rose-950 text-rose-300 rounded-full border border-rose-800">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer System Status & Chat Trigger */}
      <div className="p-3 border-t border-[#1F2630] space-y-2 bg-[#0E131A]">
        {/* Support Chatbot Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
            chatOpen
              ? 'bg-teal-950/60 text-teal-300 border-teal-700'
              : 'bg-[#161D26] text-zinc-300 border-[#1F2630] hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center space-x-2">
            <Headphones className="w-3.5 h-3.5 text-teal-400" />
            <span>Sentinel Support</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500">200+ KB</span>
        </button>

        {/* System Health */}
        <div className="px-2 py-1.5 rounded bg-[#11161D] border border-[#1F2630] flex items-center justify-between text-[11px] font-mono text-zinc-400">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>EVM Sepolia Sync</span>
          </div>
          <span className="text-zinc-500">#5410982</span>
        </div>
      </div>
    </aside>
  );
};
