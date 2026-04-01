import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAegisAgent, AVAILABLE_TARGETS } from '../hooks/useAegisAgent';
import {
  Lock, Fingerprint, Award,
  ShieldCheck, Activity, Radio, BrainCircuit, Server,
  Cpu, RotateCcw, Search,
  ShieldAlert, Bell, Zap, CheckCircle2, UploadCloud, Github, Rocket
} from 'lucide-react';
import MintHypercertButton from './MintHypercertButton';

interface DashboardProps {
  onReset: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

const Dashboard: React.FC<DashboardProps> = ({ onReset, activeTab, onTabChange }) => {
  const {
    logs, assets, activeStage,
    isRunning, awaitingMint, selectedTargets,
    gasUsed, computeBudget, agentId,
    address, deployAgent
  } = useAegisAgent();

  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [tempRepo, setTempRepo] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTargetDeploy = (id: string) => {
    const target = AVAILABLE_TARGETS.find(t => t.id === id);
    if (target?.isComingSoon) return;
    
    if (id === 'local') {
      fileInputRef.current?.click();
    } else if (id === 'github') {
      setIsGithubModalOpen(true);
    } else {
      deployAgent([id]);
    }
  };

  const submitGithubRepo = () => {
    if (tempRepo.trim()) {
      deployAgent(['github'], { github_repo: tempRepo.trim() });
      setIsGithubModalOpen(false);
      setTempRepo('');
    }
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    const formData = new FormData();
    fileArray.forEach(f => formData.append('files', f));

    try {
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        // The backend's WatchGuard (chokidar) will auto-trigger the agent
        // via SSE, so we don't need to manually call deployAgent here.
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploading(false);
    }
  }, [deployAgent]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const stages = [
    { name: 'Discover', icon: Search, tech: 'Multi-Source Scanner', label: 'DISCOVER' },
    { name: 'Plan', icon: BrainCircuit, tech: 'Sentinel Intelligence', label: 'PLAN' },
    { name: 'Encrypt', icon: Lock, tech: 'Aegis Cipher', label: 'ENCRYPT' },
    { name: 'Archive', icon: Server, tech: 'Irys / Arweave', label: 'ARCHIVE' },
    { name: 'Certify', icon: Award, tech: 'Hypercerts', label: 'CERTIFY' },
    { name: 'Swarm', icon: Radio, tech: 'ATProto / Bluesky', label: 'SWARM' },
  ];

  const gasPercentage = Math.min((gasUsed / computeBudget) * 100, 100);
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '0x...';
  const targetLabels = selectedTargets.map(t => AVAILABLE_TARGETS.find(at => at.id === t)?.label || t);

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="grid-bg" />

      {/* ─── Agent Identity Bar ─────────────────────────────── */}
      <div className="agent-identity-bar">
        <div className="agent-id-left">
          <Fingerprint size={16} />
          <span className="agent-id-label">Agent:</span>
          <span className="agent-id-value">{agentId}</span>
          <span className="agent-id-sep">|</span>
          <span className="agent-id-label">Operator:</span>
          <span className="agent-id-value">{shortAddr}</span>
          <span className="agent-id-sep">|</span>
          <span className="agent-id-label">Targets:</span>
          <span className="agent-id-value">{targetLabels.join(', ')}</span>
        </div>
        <div className="agent-id-right">
          {!isRunning && logs.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={onReset}>
              <RotateCcw size={14} /> New Mission
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-nav">
        <div 
          className={`dashboard-nav-item ${activeTab === 'overview' ? 'active' : ''}`} 
          onClick={() => onTabChange('overview')}
        >
          Overview
        </div>
        <div 
          className={`dashboard-nav-item ${activeTab === 'analytics' ? 'active' : ''}`} 
          onClick={() => onTabChange('analytics')}
        >
          Analytics
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* ─── ACTION CENTER (Mission Control) ──────────────────────── */}
          {!isRunning && (
            <div className="action-center panel glass-card hud-brackets" style={{ marginBottom: '24px', padding: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '32px' }}>
                
                {/* Manual Upload */}
                <div style={{ flex: '1' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UploadCloud size={18} style={{ color: 'var(--brand-primary)' }}/> Manual Injection
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                    Drop unstructured files here for instant encryption and ZK proofing.
                  </p>
                  <div
                    className={`mc-dropzone ${isDragOver ? 'mc-dropzone-active' : ''} hud-brackets`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ 
                      background: 'rgba(0,0,0,0.2)', 
                      minHeight: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '16px',
                      borderRadius: 'var(--radius)',
                      cursor: 'pointer'
                    }}
                  >
                    <div className={`upload-icon-circle ${isDragOver || isUploading ? 'pulse' : ''}`} style={{
                      width: '72px', height: '72px', 
                      borderRadius: '50%', 
                      background: 'rgba(16, 185, 129, 0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      marginBottom: '4px'
                    }}>
                       {isUploading ? (
                         <div className="mc-spinner" style={{ width: '32px', height: '32px', border: '3px solid rgba(16,185,129,0.3)', borderTopColor: 'var(--brand-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                       ) : (
                         <UploadCloud size={32} color="var(--brand-primary)" />
                       )}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff', letterSpacing: '-0.5px' }}>
                        {isUploading ? 'ENCRYPTING IP...' : isDragOver ? 'RELEASE TO PROTECT' : 'SECURE FILE INJECTION'}
                      </div>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        {isUploading ? 'Securing data via ZK-Sentinel brain' : 'Drop archives or click to browse local system'}
                      </div>
                    </div>
                    
                    {!isUploading && (
                      <div style={{ 
                        marginTop: '12px', 
                        fontSize: '0.65rem', 
                        color: 'rgba(16, 185, 129, 0.5)', 
                        display: 'flex', alignItems: 'center', gap: '6px',
                        textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 600
                      }}>
                        <Lock size={12} /> AES-256-GCM Secure Channel
                      </div>
                    )}
                    
                    <div className="laser-scan"></div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      style={{ display: 'none' }}
                      onChange={e => e.target.files && handleFiles(e.target.files)}
                    />
                  </div>
                </div>

                {/* Quick Targets */}
                <div style={{ flex: '1' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={18} style={{ color: 'var(--brand-secondary)' }}/> Cloud Integrations
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>
                    Select an external data source to begin immediate scan.
                  </p>
                  <div className="mc-targets-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {AVAILABLE_TARGETS.map(target => {
                      const IconComp = target.icon as any;
                      const isComingSoon = target.isComingSoon;

                      return (
                        <div
                          key={target.id}
                          className={`mc-target-card ${isComingSoon ? 'mc-target-disabled' : 'hover-glow'}`}
                          onClick={() => handleTargetDeploy(target.id)}
                          style={{ cursor: isComingSoon ? 'not-allowed' : 'pointer', padding: '16px' }}
                        >
                          {isComingSoon && <span className="coming-soon-badge" style={{ position: 'absolute', top: 8, right: 8 }}>SOON</span>}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <IconComp size={20} style={{ color: 'var(--brand-primary)' }} />
                            <h4 style={{ margin: 0, fontSize: '1rem' }}>{target.label}</h4>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ─── Stats ─────────────────────────────────────────── */}
          <div className="stats-grid">
            <div className="stat-card glass-card hud-brackets">
              <div className="stat-icon stat-icon--cyan"><ShieldCheck size={22} /></div>
              <div className="stat-info">
                <div className="stat-value">{assets.length}</div>
                <div className="stat-label">Protected Assets</div>
              </div>
            </div>
            <div className="stat-card glass-card hud-brackets">
              <div className="stat-icon stat-icon--purple"><Activity size={22} /></div>
              <div className="stat-info">
                <div className="stat-value">{assets.length > 0 ? '99.9%' : '—'}</div>
                <div className="stat-label">Integrity Score</div>
              </div>
            </div>
            <div className="stat-card glass-card hud-brackets">
              <div className="stat-icon stat-icon--pink"><Cpu size={22} /></div>
              <div className="stat-info">
                <div className="stat-value">{gasUsed > 0 ? `${(gasUsed / 1000).toFixed(0)}K` : '—'}</div>
                <div className="stat-label">Gas Used</div>
                <div className="gas-bar">
                  <div className="gas-bar-fill" style={{ width: `${gasPercentage}%` }} />
                </div>
              </div>
            </div>
            <div className="stat-card glass-card hud-brackets">
              <div className="stat-icon stat-icon--green"><Radio size={22} /></div>
              <div className="stat-info">
                <div className="stat-value">{selectedTargets.length}</div>
                <div className="stat-label">Active Sources</div>
              </div>
            </div>
          </div>

          {/* ─── Pipeline (Horizontal) ────────────────────────── */}
          <div className="panel glass-card hud-brackets pipeline-panel">
            <div className="panel-header">
              <h2 className="panel-title">Autonomous Pipeline</h2>
              {isRunning && (
                <div className="live-badge"><span className="live-dot" />{awaitingMint ? '⏳ AWAITING SIGNATURE' : 'EXECUTING'}</div>
              )}
            </div>
            <div className="pipeline-h">
              <div className="pipeline-h-track">
                <div
                  className="pipeline-h-progress"
                  style={{ width: activeStage >= 0 ? `${(activeStage / (stages.length - 1)) * 100}%` : '0%' }}
                />
              </div>
              <div className="pipeline-h-stages">
                {stages.map((stage, idx) => (
                  <div
                    key={stage.name}
                    className={`stage-h ${idx <= activeStage ? 'active' : ''} ${idx === activeStage ? 'current' : ''}`}
                  >
                    <div className="stage-h-icon">
                      <stage.icon size={16} strokeWidth={1.5} />
                    </div>
                    <div className="stage-h-label">{stage.label}</div>
                    <div className="stage-h-name">{stage.name}</div>
                    <div className="stage-h-tech">{stage.tech}</div>
                    {idx === activeStage && isRunning && (
                      <p className="stage-h-status stage-h-processing">Processing...</p>
                    )}
                    {idx < activeStage && (
                      <p className="stage-h-status stage-h-done">
                        <CheckCircle2 size={10} style={{ display: 'inline', marginRight: '3px', verticalAlign: '-1px' }} />
                        Complete
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Awaiting Wallet Signature Banner ───────────────── */}
          {awaitingMint && (
            <div className="panel glass-card hud-brackets" style={{
              padding: '28px 32px',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.08), rgba(16, 185, 129, 0.05))',
              border: '1px solid rgba(255, 215, 0, 0.25)',
              animation: 'pulse-glow 2s ease-in-out infinite'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: 'rgba(255, 215, 0, 0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255, 215, 0, 0.3)',
                  flexShrink: 0
                }}>
                  <Award size={22} color="#FFD700" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#FFD700', letterSpacing: '-0.3px' }}>
                    ⏳ Awaiting Your Wallet Signature
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
                    The agent has finished scanning and encrypting your assets. Sign the transaction below to mint your on-chain Hypercert.
                  </div>
                </div>
              </div>
              {/* Render a MintHypercertButton for each pending asset */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {assets.filter(a => a.impactId === 'HC-PENDING').map(asset => (
                  <div key={asset.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: 'rgba(0,0,0,0.25)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 215, 0, 0.12)'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>{asset.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{asset.category} · {asset.source}</div>
                    </div>
                    <MintHypercertButton assetId={asset.id} assetName={asset.name} category={asset.category} source={asset.source} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Analytics Tab ─────────────────────────────────── */}
      {activeTab === 'analytics' && (
        <div className="panel glass-card animate-fade-in dashboard-analytics-view hud-brackets" style={{ padding: '40px' }}>
          <div className="panel-header" style={{ marginBottom: '40px' }}>
            <h2 className="panel-title">Security Intelligence</h2>
            <div className="glass-pill" style={{ fontSize: '12px' }}>
              <Zap size={14} color="var(--brand-primary)"/> Local Sentinel Intelligence
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}>
            
            {/* Left: Health Indicator */}
            <div className="glass-card" style={{ padding: '32px', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
              <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto 24px' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                  <circle 
                    cx="50" cy="50" r="45" fill="none" stroke="var(--brand-primary)" 
                    strokeWidth="8" strokeDasharray="283" strokeDashoffset={assets.length > 0 ? "28" : "283"}
                    style={{ transition: 'stroke-dashoffset 2s ease-out' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '50px' }}>
                  <div style={{ fontSize: '32px', fontWeight: 800, color: '#fff' }}>{assets.length > 0 ? '94%' : '0%'}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', letterSpacing: '1px' }}>HEALTH</div>
                </div>
              </div>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Sentinel State</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                All systems functional. {assets.length} assets verified via Noir ZK-Proofs.
              </p>
            </div>

            {/* Right: Activity Chart & Metrics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="glass-card" style={{ padding: '24px', flex: 1, background: 'rgba(0,0,0,0.2)' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px', letterSpacing: '1px' }}>PROTECTION ACTIVITY (LAST 7 CYCLES)</h4>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '8px', paddingBottom: '10px' }}>
                   {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                     <div key={i} style={{ flex: 1, position: 'relative' }}>
                        <div 
                          className="shimmer-effect"
                          style={{ 
                            height: `${h}%`, 
                            background: i === 6 ? 'var(--brand-primary)' : 'rgba(16, 185, 129, 0.2)',
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 1.5s ease-out'
                          }} 
                        />
                     </div>
                   ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#444', fontSize: '10px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                    <span>C-01</span><span>C-02</span><span>C-03</span><span>C-04</span><span>C-05</span><span>C-06</span><span style={{color:'var(--brand-primary)'}}>CURRENT</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                 <div className="glass-card" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ color: 'var(--brand-secondary)', fontSize: '11px', marginBottom: '8px' }}>ENCRYPTION STRENGTH</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>AES-256-GCM</div>
                 </div>
                 <div className="glass-card" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ color: 'var(--brand-secondary)', fontSize: '11px', marginBottom: '8px' }}>DATA ANOMALIES</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>0 DETECTED</div>
                 </div>
                 <div className="glass-card" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)' }}>
                    <div style={{ color: 'var(--brand-secondary)', fontSize: '11px', marginBottom: '8px' }}>SENTINEL SWARM</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--brand-primary)' }}>CONNECTED</div>
                 </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ─── System Logs ───────────────────────────────────── */}
      {activeTab === 'system-logs' && (
        <div className="panel glass-card animate-fade-in system-logs-panel hud-brackets">
          <div className="laser-scan"></div>
          <div className="panel-header">
            <h2 className="panel-title">System Execution Logs</h2>
            {isRunning && (
              <div className="live-badge"><span className="live-dot" /> LIVE LOGGING</div>
            )}
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>Real-time cryptographic verification and pipeline execution traces.</p>
          <div className="terminal terminal-large">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="dot red" />
                <span className="dot yellow" />
                <span className="dot green" />
              </div>
              <span className="terminal-title">aegis-agent --verbose --targets={selectedTargets.join(',')}</span>
              <div className="terminal-actions">
                <span className="terminal-status">Node: Online</span>
              </div>
            </div>
            <div className="terminal-body" style={{ minHeight: '400px', maxHeight: '600px' }}>
              {logs.length === 0 && (
                <div className="terminal-line system">
                  <span className="message">Initializing agent... Waiting for telemetry.</span>
                </div>
              )}
              {logs.map((log, i) => (
                <div key={i} className={`terminal-line ${log.type}`}>
                  <span className="timestamp">[{log.timestamp}]</span>
                  <span className="message">{log.message}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* ─── Assets Table ──────────────────────────────────── */}
      {activeTab === 'protected-ip' && (
        <div className="panel assets-panel animate-fade-in hud-brackets">
          <div className="laser-scan"></div>
          <div className="panel-header">
            <h2 className="panel-title">Protected Intellectual Property</h2>
          </div>
          <div className="table-container">
            <table className="assets-table">
              <thead>
                <tr>
                  <th>Asset Name</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Status</th>
                  <th>ZK Transaction</th>
                  <th>Impact ID</th>
                </tr>
              </thead>
              <tbody>
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className="table-empty">
                        <div className="radar-container">
                          <div className="radar-scan" />
                          <Search size={28} color="var(--cyan)" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <span style={{ display: 'block', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            {isRunning ? 'System Discovery in Progress' : 'Agent Standby'}
                          </span>
                          <span>{isRunning ? 'Scanning connected targets for unprotected IP...' : 'Deploy agent to start the 5-stage protection cycle.'}</span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  assets.map(asset => (
                    <tr key={asset.id}>
                      <td><strong>{asset.name}</strong></td>
                      <td><span className={`category-badge cat-${asset.category}`}>{asset.category}</span></td>
                      <td><span className="source-badge">{asset.source}</span></td>
                      <td><span className="zk-badge"><ShieldCheck size={13} /> Secured</span></td>
                      <td><a href="#" className="tx-link">{asset.txHash}</a></td>
                      <td>
                        {asset.impactId === 'HC-PENDING' ? (
                          <MintHypercertButton assetId={asset.id} assetName={asset.name} category={asset.category} source={asset.source} />
                        ) : (
                          <a 
                            href={`https://sepolia.etherscan.io/search?q=${asset.impactId.replace('HC-', '')}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="impact-badge impact-link"
                            title="Verify on Hypercerts Swarm"
                          >
                            <Award size={12} /> {asset.impactId}
                          </a>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Cloud Integrations ────────────────────────────── */}
      {activeTab === 'cloud-integrations' && (
        <div className="panel animate-fade-in glass-card hud-brackets">
          <div className="panel-header">
            <h2 className="panel-title">Active Cloud Integrations</h2>
          </div>
          <div className="mc-targets-grid" style={{ padding: '24px' }}>
            {AVAILABLE_TARGETS.filter(t => selectedTargets.includes(t.id)).map(t => {
              const Icon = t.icon as any;
              return (
                <div key={t.id} className="mc-target-card mc-target-selected" style={{ cursor: 'default', transform: 'none' }}>
                  <div className="mc-target-check"><ShieldCheck size={20} /></div>
                  <div className="mc-target-icon mc-target-icon-active">
                    <Icon size={24} />
                  </div>
                  <h3>{t.label}</h3>
                  <p>Status: Monitoring and protecting autonomously</p>
                </div>
              );
            })}
            {selectedTargets.length === 0 && (
              <p style={{ color: 'var(--text-secondary)' }}>No cloud integrations configured.</p>
            )}
          </div>
        </div>
      )}

      {/* ─── Agent Settings ────────────────────────────────── */}
      {activeTab === 'agent-settings' && (
        <div className="panel animate-fade-in">
          <div className="panel-header">
            <h2 className="panel-title">Agent Configuration</h2>
            <div className="live-badge"><span className="live-dot" /> LIVE SYNC</div>
          </div>
          
          <div className="settings-grid">
            {/* Setting: Compute */}
            <div className="setting-card">
              <div className="setting-header">
                <div className="setting-icon" style={{ background: 'rgba(0, 240, 255, 0.1)', color: 'var(--cyan)' }}>
                  <Zap size={20} />
                </div>
                <div className="setting-header-info">
                  <h3>Compute Allocation</h3>
                  <p>Maximum resources AegisAgent can consume per scan cycle.</p>
                </div>
              </div>
              
              <div className="setting-row">
                <div className="setting-label">
                  <strong>Max Gas Limit</strong>
                  <span>Auto-stops if exceeded</span>
                </div>
                <div style={{ width: '120px', position: 'relative' }}>
                  <div className="setting-slider-val">50,000 Gwei</div>
                  <div className="setting-slider">
                    <div className="setting-slider-fill" style={{ width: '60%' }} />
                    <div className="setting-slider-thumb" style={{ left: '60%' }} />
                  </div>
                </div>
              </div>
              <div className="setting-row">
                <div className="setting-label">
                  <strong>Storage Budget</strong>
                  <span>Arweave permanent storage</span>
                </div>
                <div style={{ width: '120px', position: 'relative' }}>
                  <div className="setting-slider-val">500 MB</div>
                  <div className="setting-slider">
                    <div className="setting-slider-fill" style={{ width: '50%' }} />
                    <div className="setting-slider-thumb" style={{ left: '50%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Setting: Security & ZK */}
            <div className="setting-card">
              <div className="setting-header">
                <div className="setting-icon" style={{ background: 'rgba(123, 97, 255, 0.1)', color: 'var(--purple)' }}>
                  <ShieldAlert size={20} />
                </div>
                <div className="setting-header-info">
                  <h3>Zero-Knowledge Proofs</h3>
                  <p>Configure the cryptographic security level of generated proofs.</p>
                </div>
              </div>
              
              <div className="setting-row">
                <div className="setting-label">
                  <strong>Maximum Security (Noir)</strong>
                  <span>Slower generation, higher cost</span>
                </div>
                <div className="setting-toggle on" />
              </div>
              <div className="setting-row">
                <div className="setting-label">
                  <strong>Obfuscate Metadata</strong>
                  <span>Hide file names in ZK circuit</span>
                </div>
                <div className="setting-toggle on" />
              </div>
            </div>

            {/* Setting: Remediation */}
            <div className="setting-card">
              <div className="setting-header">
                <div className="setting-icon" style={{ background: 'rgba(255, 71, 87, 0.1)', color: 'var(--red)' }}>
                  <RotateCcw size={20} />
                </div>
                <div className="setting-header-info">
                  <h3>Autonomous Remediation</h3>
                  <p>Actions taken when unprotected IP is discovered.</p>
                </div>
              </div>
              
              <div className="setting-row">
                <div className="setting-label">
                  <strong>Auto-Archive to Arweave</strong>
                  <span>Instantly protect discovered assets</span>
                </div>
                <div className="setting-toggle on" />
              </div>
              <div className="setting-row">
                <div className="setting-label">
                  <strong>Dry Run (Alert Only)</strong>
                  <span>Do not mint proofs, send alert only</span>
                </div>
                <div className="setting-toggle" />
              </div>
            </div>

            {/* Setting: Alerts */}
            <div className="setting-card">
              <div className="setting-header">
                <div className="setting-icon" style={{ background: 'rgba(0, 214, 143, 0.1)', color: 'var(--green)' }}>
                  <Bell size={20} />
                </div>
                <div className="setting-header-info">
                  <h3>Alerts & Webhooks</h3>
                  <p>Get notified when the agent detects a leak.</p>
                </div>
              </div>
              
              <div className="setting-row">
                <div className="setting-label">
                  <strong>Email Alerts</strong>
                </div>
                <div className="setting-toggle on" />
              </div>
              <div className="setting-row" style={{ borderTop: 'none', paddingTop: 0 }}>
                <input type="text" className="setting-input" defaultValue="operator@aegis.agent" placeholder="Email Address..." />
              </div>
              
              <div className="setting-row">
                <div className="setting-label">
                  <strong>Slack Webhook</strong>
                </div>
                <div className="setting-toggle" />
              </div>
              <div className="setting-row" style={{ borderTop: 'none', paddingTop: 0 }}>
                <input type="text" className="setting-input" placeholder="https://hooks.slack.com/..." />
              </div>
            </div>

          </div>
        </div>
      )}
      {/* ─── GitHub Repo Modal ────────────────────────────────── */}
      {isGithubModalOpen && (
        <div className="modal-overlay" onClick={() => setIsGithubModalOpen(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="laser-scan"></div>
            <h2 className="modal-title">Sync GitHub Repository</h2>
            <p className="modal-description">
              Enter the repository slug you wish to protect. AegisAgent will clone and monitor for unprotected IP.
            </p>
            
            <div className="input-group">
              <input
                type="text"
                className="premium-input"
                placeholder="e.g. Aegis/Sentinel-Core"
                value={tempRepo}
                onChange={e => setTempRepo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitGithubRepo()}
                autoFocus
              />
              <div className="input-icon-wrap">
                <Github size={18} />
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="btn btn-ghost btn-cancel" 
                onClick={() => setIsGithubModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={submitGithubRepo}
                disabled={!tempRepo.trim()}
              >
                Start Guarding <Rocket size={16} style={{ marginLeft: '4px' }} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
