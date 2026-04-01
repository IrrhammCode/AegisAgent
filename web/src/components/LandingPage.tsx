import React from 'react';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import {
  Shield, Zap, Search, Lock, Database, Award,
  ArrowRight, BrainCircuit, Server, Radio
} from 'lucide-react';
import { useAccount } from 'wagmi';

interface LandingProps {
  onEnterApp: () => void;
}

const LandingPage: React.FC<LandingProps> = ({ onEnterApp }) => {
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();

  const handleAction = () => {
    if (isConnected) {
      onEnterApp();
    } else if (openConnectModal) {
      openConnectModal();
    }
  };

  return (
    <div className="landing-page">
      <div className="grid-bg" />
      <div className="noise-overlay" />

      {/* ═══════ HERO ═══════ */}
      <header className="hero-landing relative flex flex-col justify-center min-h-[90vh] pb-24 pt-32" id="hero">
        <div className="hero-center z-10">
          <div className="animate-fade-in" style={{ animationDelay: '0s' }}>
            <span className="glass-pill font-bold tracking-wide" style={{ color: 'var(--brand-primary)', marginBottom: '40px' }}>
              <Zap size={14} className="glow-primary" style={{ borderRadius: '50%' }} />
              <span>THE NEXT GENERATION OF <strong style={{ color: '#fff' }}>AUTONOMOUS IP SECURITY</strong></span>
            </span>
          </div>

          <h1 className="hero-title-new font-extrabold tracking-tighter" style={{ fontSize: 'clamp(4.5rem, 10vw, 7.5rem)', lineHeight: '0.95', marginBottom: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ color: '#F8FAFC' }}>Digital Rights.</span>
            <span className="text-gradient" style={{ paddingBottom: '8px', display: 'inline-block' }}>Fully Autonomous.</span>
          </h1>

          <p className="hero-subtitle-new font-display" style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '750px', margin: '0 auto 48px', fontWeight: 400, opacity: 0.8, lineHeight: '1.8' }}>
            AegisAgent is a Glass-Box AI guardian. It autonomously secures your code, assets, <br className="hidden md:block"/>
            and data — encrypting locally and <strong style={{ color: '#fff', fontWeight: 600 }}>cryptographically publishing proofs to Arweave.</strong>
          </p>

          <div className="hero-cta-row" style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
            <button 
              className="btn font-bold" 
              onClick={handleAction}
              style={{
                background: 'var(--brand-primary)', color: '#010805', padding: '16px 36px', 
                borderRadius: '9999px', fontSize: '1.1rem', 
                boxShadow: '0 0 30px rgba(16,185,129,0.3)', transition: 'all 0.3s'
              }}
            >
              {isConnected ? "Enter AI Dashboard" : "Sync Wallet to Deploy"} <ArrowRight size={18} style={{ marginLeft: '8px' }} />
            </button>
            <a
              href="https://github.com/IrrhammCode/AegisAgent"
              target="_blank"
              rel="noreferrer"
              className="glass-pill"
              style={{ padding: '16px 36px', fontSize: '1.1rem', color: '#fff', textDecoration: 'none', transition: 'all 0.3s' }}
            >
              Explore Architecture
            </a>
          </div>
        </div>
      </header>

      {/* ═══════ PIPELINE (FlowTalos Style) ═══════ */}
      <section className="pipeline-section" id="how-it-works" style={{ paddingTop: '80px', paddingBottom: '80px', background: '#010805' }}>
        <div className="section-container">
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <div className="glass-pill" style={{ marginBottom: '24px', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--brand-primary)' }}>
              Runtime Simulation
            </div>
            <h2 className="section-title font-extrabold tracking-tight" style={{ fontSize: '3.5rem', marginBottom: '24px' }}>
              The Architecture of <span className="text-gradient">Autonomy</span>
            </h2>
            <p className="section-desc font-light" style={{ maxWidth: '700px', margin: '0 auto', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
              Watch how AegisAgent securely coordinates across local environments and decentralized networks to protect a single piece of IP.
            </p>
          </div>

          {/* Horizontal Nodes */}
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px' }}>
            {/* Connecting Line */}
            <div style={{ position: 'absolute', top: '40px', left: '10%', right: '10%', height: '2px', background: 'rgba(16,185,129,0.1)', zIndex: 0 }}></div>

            {[
              { num: '01', name: 'Discover', desc: 'Local & Cloud', icon: Search },
              { num: '02', name: 'Classify', desc: 'Local Intel', icon: BrainCircuit },
              { num: '03', name: 'Encrypt', desc: 'Aegis Cipher', icon: Lock },
              { num: '04', name: 'Archive', desc: 'Arweave', icon: Server },
              { num: '05', name: 'Certify', desc: 'Hypercerts', icon: Award },
              { num: '06', name: 'Swarm', desc: 'Sentinel Swarm', icon: Radio },
            ].map((step) => (
              <div key={step.num} style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#020a06', border: '2px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', position: 'relative', boxShadow: '0 0 30px rgba(16,185,129,0.1)' }}>
                  <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-primary)', color: '#020a06', fontWeight: 800, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {step.num}
                  </div>
                  <step.icon size={32} style={{ color: 'var(--brand-primary)' }} />
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>{step.name}</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ USE CASE / BENTO GRID ═══════ */}
      <section className="usecase-section" id="features" style={{ paddingTop: '100px', paddingBottom: '100px', background: '#020a06' }}>
        <div className="section-container">
          <div style={{ marginBottom: '80px', maxWidth: '800px' }}>
            <h2 className="font-extrabold tracking-tighter" style={{ fontSize: '4rem', lineHeight: '1.1', marginBottom: '24px' }}>
              IP Protection, <br />
              <span className="text-gradient">Upgraded.</span>
            </h2>
            <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', fontWeight: 300, lineHeight: '1.8' }}>
              The holy trinity of modern creative rights: Speed, Intelligence, and Provable Cryptographic Transparency.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
            {/* Bento 1: Wide */}
            <div className="glass-card" style={{ gridColumn: 'span 2', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'linear-gradient(to bottom right, rgba(4,24,16,0.8), rgba(4,24,16,0.3))' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(16,185,129,0.1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', border: '1px solid rgba(16,185,129,0.2)' }}>
                <BrainCircuit size={32} style={{ color: 'var(--brand-primary)' }} />
              </div>
              <div>
                <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>Local Sentinel Intelligence</h3>
                <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', maxWidth: '500px' }}>
                  High-performance local analysis engines categorize unstructured IP without external data leaks, ensuring complete privacy before encryption.
                </p>
              </div>
            </div>

            {/* Bento 2: Tall */}
            <div className="glass-card" style={{ gridColumn: 'span 1', gridRow: 'span 2', padding: '48px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: 'linear-gradient(to bottom, rgba(4,24,16,0.3), rgba(4,24,16,0.9))' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(16,185,129,0.15)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '32px', border: '1px solid rgba(16,185,129,0.25)' }}>
                <Database size={32} style={{ color: 'var(--brand-primary)' }} />
              </div>
              <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>Zero-Knowledge Archival</h3>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px' }}>
                No central servers. Private files are AES-encrypted locally before being permanently pinned to Arweave for 200+ years.
              </p>
              <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--brand-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                arweave://bafybeig...q4m/log
              </div>
            </div>

            {/* Bento 3 */}
            <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Shield size={40} style={{ color: 'var(--brand-primary)', marginBottom: '32px', opacity: 0.8 }} />
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>Local-First Privacy</h3>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 300, lineHeight: '1.6' }}>Runs silently on your OS daemon. Files never leave your device unencrypted.</p>
              </div>
            </div>

            {/* Bento 4 */}
            <div className="glass-card" style={{ padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Award size={40} style={{ color: 'var(--brand-primary)', marginBottom: '32px', opacity: 0.8 }} />
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: '12px' }}>On-Chain Hypercerts</h3>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 300, lineHeight: '1.6' }}>Mint irrefutable ERC-1155 impact certificates representing your protected IP.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ CTA ═══════ */}
      <section className="cta-section" style={{ padding: '120px 24px', background: '#010805', position: 'relative' }}>
        <div className="section-container">
          <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center', background: 'linear-gradient(to bottom, rgba(4,24,16,0.8), rgba(2,10,6,1))', border: '1px solid rgba(16,185,129,0.1)', boxShadow: '0 0 80px rgba(16,185,129,0.1)' }}>
            <h2 className="font-extrabold tracking-tight" style={{ fontSize: '4.5rem', color: '#fff', marginBottom: '24px', lineHeight: '1.2' }}>
              Ready to automate <br className="hidden sm:block" /> your IP defense?
            </h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 48px', fontWeight: 300 }}>
              Join the waiting list for AegisAgent early access. Experience the first transparent, decentralized, AI-driven IP guardian.
            </p>
            <div style={{ display: 'flex', gap: '24px', justifyContent: 'center' }}>
              <button 
                className="font-bold" 
                onClick={handleAction}
                style={{ background: 'var(--brand-primary)', color: '#010805', padding: '16px 40px', borderRadius: '9999px', fontSize: '1.1rem', boxShadow: '0 0 30px rgba(16,185,129,0.3)', cursor: 'pointer', border: 'none' }}>
                <Zap size={18} style={{ display: 'inline', marginRight: '8px', verticalAlign: '-3px' }} /> {isConnected ? "Launch Agent" : "Connect & Launch"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="footer-landing">
        <div className="section-container">
          <div className="footer-grid">
            <div className="footer-brand-col">
              <div className="footer-logo-row">
                <Shield size={16} />
                <strong>AegisAgent</strong>
              </div>
              <p>Autonomous IP protection. Built for PL_Genesis 2026.</p>
            </div>
            <div className="footer-links-col">
              <h5>Technology</h5>
              <a href="https://noir-lang.org" target="_blank" rel="noreferrer">Noir</a>
              <a href="https://irys.xyz" target="_blank" rel="noreferrer">Irys / Arweave</a>
              <a href="https://hypercerts.org" target="_blank" rel="noreferrer">Hypercerts</a>
            </div>
            <div className="footer-links-col">
              <h5>Project</h5>
              <a href="https://github.com/IrrhammCode/AegisAgent" target="_blank" rel="noreferrer">GitHub</a>
              <a href="#how-it-works">Documentation</a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>&copy; 2026 AegisAgent &middot; Autonomous IP Protection</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
