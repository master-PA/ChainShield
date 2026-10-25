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
  const [navOpen, setNavOpen] = useState(false);

  // Synchronize with URL hash or path if present
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace(/^#/, '');
      setCurrentRoute(hash || '/');
    };
    handlePopState();
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = (route: string) => {
    setCurrentRoute(route);
    setNavOpen(false);
    window.location.hash = route;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderCurrentPage = () => {
    const path = currentRoute.split('?')[0];
    switch (path) {
      case '/':
      case '/landing':
        return <Landing navigate={navigate} />;
      case '/dashboard':
        return <Dashboard navigate={navigate} />;
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

  const routePath = currentRoute.split('?')[0];
  const isLanding = routePath === '/' || routePath === '/landing';

  return (
    <SecurityProvider>
      {isLanding ? (
        <div className="min-h-screen bg-[#F5F7F5]">
          {renderCurrentPage()}
          <ChatPanel navigate={navigate} />
        </div>
      ) : (
        <div className="min-h-screen bg-[#0B0F14] text-zinc-100 flex flex-col font-sans">
          {/* Left sidebar (drawer on small screens) */}
          <Sidebar
            currentRoute={routePath}
            navigate={navigate}
            open={navOpen}
            onClose={() => setNavOpen(false)}
          />

          {/* Top header */}
          <Topbar navigate={navigate} onMenu={() => setNavOpen(true)} />

          {/* Main content */}
          <main
            key={routePath}
            className="page-enter lg:ml-64 mt-16 px-4 sm:px-6 lg:px-8 py-6 min-h-[calc(100vh-4rem)] max-w-[1400px]"
          >
            {renderCurrentPage()}
          </main>

          {/* Collapsible right-docked support chatbot */}
          <ChatPanel navigate={navigate} />
        </div>
      )}
    </SecurityProvider>
  );
}
