import React, { useState, useEffect } from 'react';
import { SecurityProvider } from './context/SecurityContext';
import { Sidebar } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { ChatPanel } from './components/chat/ChatPanel';
import { Dashboard } from './pages/Dashboard';
import { Scanner } from './pages/Scanner';
import { WalletHealth } from './pages/WalletHealth';
import { Reports } from './pages/Reports';
import { History } from './pages/History';
import { Community } from './pages/Community';
import { Verify } from './pages/Verify';
import { Alerts } from './pages/Alerts';
import { DrainerKits } from './pages/DrainerKits';
import { Developers } from './pages/Developers';
import { Extension } from './pages/Extension';
import { Settings } from './pages/Settings';
import { Landing } from './pages/Landing';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('/');

  // Synchronize with URL hash or path if present
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash) {
        setCurrentRoute(hash);
      }
    };
    handlePopState();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: string) => {
    setCurrentRoute(route);
    window.location.hash = route;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentPage = () => {
    const path = currentRoute.split('?')[0];
    switch (path) {
      case '/':
      case '/dashboard':
        return <Dashboard navigate={navigate} />;
      case '/landing':
        return <Landing navigate={navigate} />;
      case '/scanner':
        return <Scanner navigate={navigate} />;
      case '/wallet-health':
        return <WalletHealth navigate={navigate} />;
      case '/reports':
        return <Reports navigate={navigate} />;
      case '/history':
        return <History navigate={navigate} />;
      case '/community':
        return <Community navigate={navigate} />;
      case '/verify':
        return <Verify navigate={navigate} />;
      case '/alerts':
        return <Alerts navigate={navigate} />;
      case '/drainer-kits':
        return <DrainerKits navigate={navigate} />;
      case '/developers':
        return <Developers />;
      case '/extension':
        return <Extension navigate={navigate} />;
      case '/settings':
        return <Settings />;
      default:
        return <Dashboard navigate={navigate} />;
    }
  };

  return (
    <SecurityProvider>
      <div className="min-h-screen bg-[#0B0F14] text-[#E6EAF0] flex flex-col font-sans">
        {/* Left Fixed Sidebar */}
        <Sidebar currentRoute={currentRoute.split('?')[0]} navigate={navigate} />

        {/* Top Header */}
        <Topbar navigate={navigate} />

        {/* Main Content View */}
        <main className="ml-64 mt-14 p-6 min-h-[calc(100vh-3.5rem)] max-w-7xl">
          {renderCurrentPage()}
        </main>

        {/* Collapsible Right-Docked Support Chatbot */}
        <ChatPanel navigate={navigate} />
      </div>
    </SecurityProvider>
  );
}
