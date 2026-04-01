import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useAegisAgent } from './hooks/useAegisAgent';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const { isConnected } = useAccount();
  const { resetAgent } = useAegisAgent();
  const [showLanding, setShowLanding] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // If wallet disconnects while inside the app, return to landing
  useEffect(() => {
    if (!isConnected && !showLanding) {
      setShowLanding(true);
      resetAgent();
    }
  }, [isConnected, showLanding, resetAgent]);

  const handleReset = () => {
    resetAgent();
    setShowLanding(true);
  };

  const handleEnterApp = () => {
    setShowLanding(false);
  };

  // Determine current view
  let currentView: 'landing' | 'dashboard' = 'landing';
  if (showLanding) currentView = 'landing';
  else if (isConnected) currentView = 'dashboard';

  return (
    <div className="app-root">
      {/* Ambient glow */}
      <div className="ambient-bg">
        <div className="ambient-orb orb-1" />
        <div className="ambient-orb orb-2" />
      </div>

      <Navbar
        isDashboard={currentView === 'dashboard'}
        onLandingClick={() => { resetAgent(); setShowLanding(true); }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main style={{ position: 'relative', zIndex: 1 }}>
        {currentView === 'landing' && (
          <LandingPage onEnterApp={handleEnterApp} />
        )}
        {currentView === 'dashboard' && (
          <Dashboard onReset={handleReset} activeTab={activeTab} onTabChange={setActiveTab} />
        )}
      </main>
    </div>
  );
};

export default App;
