import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';

interface NavbarProps {
  isDashboard: boolean;
  onLandingClick?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ isDashboard, onLandingClick, activeTab, onTabChange }) => {
  return (
    <nav className="nav">
      <div className="nav-brand" onClick={onLandingClick} style={{ cursor: 'pointer' }}>
          <img src="/aegis-logo.png" alt="AegisAgent Logo" style={{ width: '32px', height: '32px', borderRadius: '4px' }} />
        <span className="nav-title">AEGIS</span>
        <span className="nav-badge">AGENT</span>
      </div>

      <div className="nav-links">
        {isDashboard ? (
          <>
            <a href="#overview" onClick={(e) => { e.preventDefault(); onTabChange?.('overview'); }} className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}>Overview</a>
            <a href="#system-logs" onClick={(e) => { e.preventDefault(); onTabChange?.('system-logs'); }} className={`nav-link ${activeTab === 'system-logs' ? 'active' : ''}`}>System Logs</a>
            <a href="#cloud-integrations" onClick={(e) => { e.preventDefault(); onTabChange?.('cloud-integrations'); }} className={`nav-link ${activeTab === 'cloud-integrations' ? 'active' : ''}`}>Cloud Integrations</a>
            <a href="#protected-ip" onClick={(e) => { e.preventDefault(); onTabChange?.('protected-ip'); }} className={`nav-link ${activeTab === 'protected-ip' ? 'active' : ''}`}>Protected IP</a>
            <a href="#agent-settings" onClick={(e) => { e.preventDefault(); onTabChange?.('agent-settings'); }} className={`nav-link ${activeTab === 'agent-settings' ? 'active' : ''}`}>Agent Settings</a>
          </>
        ) : (
          <>
            <a href="#how-it-works" className="nav-link">How it Works</a>
            <a href="#features" className="nav-link">Capabilities</a>
            <a href="#architecture" className="nav-link">Architecture</a>
          </>
        )}
      </div>

      <div className="nav-actions">
        <ConnectButton 
          label="Connect Wallet"
          accountStatus="address"
          chainStatus="icon"
          showBalance={false}
        />
      </div>
    </nav>
  );
};

export default Navbar;
