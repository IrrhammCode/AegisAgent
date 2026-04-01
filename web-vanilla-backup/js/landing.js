/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AEGIS ZK-SENTINEL — Landing Page Controller                ║
 * ║  Handles wallet connection + navigation to dashboard.       ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── State ───────────────────────────────────────────────────

let walletState = {
    connected: false,
    address: null,
    chainId: null,
    provider: null
};

// ─── DOM Ready ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initWalletModal();
    initNavScroll();
    initParticles();
    checkExistingConnection();
});

// ─── Wallet Modal ────────────────────────────────────────────

function initWalletModal() {
    const modal = document.getElementById('walletModal');
    const closeBtn = document.getElementById('modalClose');

    // Connect buttons -> open modal
    const connectBtns = [
        document.getElementById('btnConnectHero'),
        document.getElementById('btnConnectNav'),
        document.getElementById('btnConnectCTA')
    ];

    connectBtns.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', () => {
                if (walletState.connected) {
                    // Already connected -> go to dashboard
                    goToDashboard();
                } else {
                    openModal();
                }
            });
        }
    });

    // Close modal
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Wallet options
    document.getElementById('walletMetaMask')?.addEventListener('click', connectMetaMask);
    document.getElementById('walletWC')?.addEventListener('click', connectWalletConnect);
    document.getElementById('walletDemo')?.addEventListener('click', connectDemo);

    // ESC to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

function openModal() {
    const modal = document.getElementById('walletModal');
    if (modal) modal.classList.add('active');
}

function closeModal() {
    const modal = document.getElementById('walletModal');
    if (modal) modal.classList.remove('active');
}

// ─── MetaMask Connection ─────────────────────────────────────

async function connectMetaMask() {
    if (typeof window.ethereum === 'undefined') {
        showToast('MetaMask not detected. Please install the MetaMask extension.', 'error');
        return;
    }

    try {
        // Request account access
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });

        if (accounts.length > 0) {
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });

            walletState = {
                connected: true,
                address: accounts[0],
                chainId: chainId,
                provider: 'metamask'
            };

            // Save to session
            sessionStorage.setItem('aegis_wallet', JSON.stringify(walletState));

            // Check if on Sepolia (11155111 = 0xaa36a7)
            if (chainId !== '0xaa36a7') {
                showToast('Please switch to Sepolia testnet for full functionality.', 'warning');
                // Try to switch
                try {
                    await window.ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0xaa36a7' }]
                    });
                } catch (switchError) {
                    console.log('Chain switch failed:', switchError);
                }
            }

            updateUIConnected();
            closeModal();

            // Small delay then go to dashboard
            setTimeout(goToDashboard, 800);
        }
    } catch (error) {
        console.error('MetaMask connection failed:', error);
        showToast('Connection rejected or failed.', 'error');
    }
}

// ─── WalletConnect (placeholder) ─────────────────────────────

function connectWalletConnect() {
    showToast('WalletConnect integration coming soon. Use MetaMask or Demo Mode.', 'info');
}

// ─── Demo Mode ───────────────────────────────────────────────

function connectDemo() {
    walletState = {
        connected: true,
        address: '0xDEMO...Aegis',
        chainId: '0xaa36a7',
        provider: 'demo'
    };

    sessionStorage.setItem('aegis_wallet', JSON.stringify(walletState));
    updateUIConnected();
    closeModal();

    setTimeout(goToDashboard, 600);
}

// ─── UI Updates ──────────────────────────────────────────────

function updateUIConnected() {
    const label = document.getElementById('walletLabel');
    const btn = document.getElementById('btnConnectNav');
    const heroBtn = document.getElementById('btnConnectHero');

    const shortAddr = walletState.address.length > 12
        ? `${walletState.address.slice(0, 6)}...${walletState.address.slice(-4)}`
        : walletState.address;

    if (label) label.textContent = shortAddr;
    if (btn) btn.classList.add('connected');

    if (heroBtn) {
        heroBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
            Go to Dashboard
        `;
    }
}

function goToDashboard() {
    window.location.href = 'dashboard.html';
}

// ─── Check Existing Connection ───────────────────────────────

function checkExistingConnection() {
    const saved = sessionStorage.getItem('aegis_wallet');
    if (saved) {
        try {
            walletState = JSON.parse(saved);
            if (walletState.connected) {
                updateUIConnected();
            }
        } catch (e) {
            sessionStorage.removeItem('aegis_wallet');
        }
    }
}

// ─── Toast Notifications ─────────────────────────────────────

function showToast(message, type = 'info') {
    // Remove existing toast
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
        error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>',
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };

    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    document.body.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ─── Nav Scroll Highlight ────────────────────────────────────

function initNavScroll() {
    const links = document.querySelectorAll('.nav-link');
    const sections = ['how-it-works', 'features', 'tech', 'architecture'];

    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY + 120;

        for (const id of sections) {
            const el = document.getElementById(id);
            if (el && scrollY >= el.offsetTop && scrollY < el.offsetTop + el.offsetHeight) {
                links.forEach(l => l.classList.remove('active'));
                const active = document.querySelector(`.nav-link[href="#${id}"]`);
                if (active) active.classList.add('active');
            }
        }
    });
}

// ─── Particle System ─────────────────────────────────────────

function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const count = 30;
    for (let i = 0; i < count; i++) {
        createParticle(container);
    }
}

function createParticle(container) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    
    // Random position
    const x = Math.random() * 100;
    const duration = 10 + Math.random() * 20;
    const delay = Math.random() * 10;
    const size = 1 + Math.random() * 2;
    const opacity = 0.1 + Math.random() * 0.3;

    particle.style.left = `${x}%`;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.opacity = opacity;
    particle.style.animationDuration = `${duration}s`;
    particle.style.animationDelay = `-${delay}s`;

    container.appendChild(particle);

    // Re-create when animation ends
    particle.addEventListener('animationiteration', () => {
        particle.style.left = `${Math.random() * 100}%`;
    });
}
