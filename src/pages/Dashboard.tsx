import React, { useState } from 'react';
import {
  Scan,
  ShieldAlert,
  FileCheck,
  Users,
  BellRing,
  Wallet,
  Activity,
  ArrowRight,
  Database,
} from 'lucide-react';
import { StatCard } from '../components/dashboard/StatCard';
import { RiskDistribution, ScanTrend } from '../components/dashboard/RiskDistribution';
import { ThreatGlobe } from '../three/ThreatGlobe';
import { ThreatFeed, TopCategories, DrainerKitPanel } from '../components/dashboard/ThreatPanels';
import {
  ApprovalsAtRiskPanel,
  UpgradeTripwirePanel,
  RecentScansTable,
} from '../components/dashboard/ApprovalsAndAlerts';
import {
  CommunityLeadersPanel,
  ModelPanel,
  ProviderHealthPanel,
} from '../components/dashboard/OpsPanels';
import { useSecurity } from '../context/SecurityContext';

interface DashboardProps {
  navigate: (route: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ navigate }) => {
  const { allScans, tripwireAlerts, communityReports, walletHealth, runTargetScan, isDemoDataset } =
    useSecurity();
  const [selectedThreatCategory, setSelectedThreatCategory] = useState<string>('all');

  const handleSelectTarget = (target: string) => {
    runTargetScan(target);
    navigate(`/scanner?target=${encodeURIComponent(target)}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1F2630] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold text-zinc-100">Security Operations Console</h1>
            {isDemoDataset && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-teal-300 border border-teal-800">
                Demo dataset
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Real-time pre-transaction telemetry, supervised ML scoring, and EVM Sepolia proof anchors
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate('/scanner')}
            className="px-3.5 py-1.5 rounded bg-teal-500 hover:bg-teal-400 text-[#0B0F14] font-semibold text-xs flex items-center space-x-1.5 transition-colors"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>New Pre-Scan</span>
          </button>
        </div>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label="Total Scans"
          value="7,830"
          delta="+18.4%"
          deltaType="positive"
          icon={Scan}
          sublabel="this week"
          onClick={() => navigate('/history')}
        />
        <StatCard
          label="Critical Targets"
          value="1,845"
          delta="+4.2%"
          deltaType="negative"
          icon={ShieldAlert}
          sublabel="blocked"
          onClick={() => navigate('/history?level=CRITICAL')}
        />
        <StatCard
          label="Evidence Proofs"
          value="5,410"
          delta="100%"
          deltaType="positive"
          icon={FileCheck}
          sublabel="on Sepolia"
          onClick={() => navigate('/verify')}
        />
        <StatCard
          label="Community Reports"
          value={communityReports.length.toString()}
          delta="+12 new"
          deltaType="positive"
          icon={Users}
          sublabel="staked"
          onClick={() => navigate('/community')}
        />
        <StatCard
          label="Active Alerts"
          value={tripwireAlerts.length.toString()}
          delta="1 Tripwire"
          deltaType="negative"
          icon={BellRing}
          sublabel="active"
          onClick={() => navigate('/alerts')}
        />
        <StatCard
          label="Wallets Audited"
          value="3,290"
          delta="+340"
          deltaType="positive"
          icon={Wallet}
          sublabel="monitored"
          onClick={() => navigate('/wallet-health')}
        />
      </div>

      {/* Row 2: Distribution, Trend & 3D Threat Globe */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <RiskDistribution />
        <ScanTrend />
        <ThreatGlobe selectedCategory={selectedThreatCategory} />
      </div>

      {/* Row 3: Live Threat Feed, Top Scam Categories, Drainer Kit Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ThreatFeed onSelectTarget={handleSelectTarget} />
        <TopCategories
          onSelectCategory={(cat) => setSelectedThreatCategory(cat)}
          selectedCategory={selectedThreatCategory}
        />
        <DrainerKitPanel onNavigateToKits={() => navigate('/drainer-kits')} />
      </div>

      {/* Row 4: Approvals At Risk, Upgrade Tripwire Alerts, Recent Scans */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ApprovalsAtRiskPanel navigate={navigate} />
        <UpgradeTripwirePanel navigate={navigate} />
        <div className="lg:col-span-1">
          <RecentScansTable onSelectTarget={handleSelectTarget} navigate={navigate} />
        </div>
      </div>

      {/* Row 5: Community Leaders, Supervised Model Panel, Provider Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <CommunityLeadersPanel onNavigateCommunity={() => navigate('/community')} />
        <ModelPanel />
        <ProviderHealthPanel />
      </div>
    </div>
  );
};
