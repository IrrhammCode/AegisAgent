/**
 * AEGIS Dashboard — Wallet Guard & Session Controller
 * Checks wallet connection state and controls dashboard visibility.
 */

(function() {
    const guard = document.getElementById('walletGuard');
    const main = document.getElementById('dashboardMain');
    const footer = document.getElementById('dashboardFooter');
    const navAddr = document.getElementById('navWalletAddr');
    const btnDisconnect = document.getElementById('btnDisconnect');

    // Check wallet state from sessionStorage
    const saved = sessionStorage.getItem('aegis_wallet');
    let wallet = null;

    if (saved) {
        try {
            wallet = JSON.parse(saved);
        } catch (e) {
            wallet = null;
        }
    }

    if (wallet && wallet.connected) {
        // Wallet is connected — show dashboard
        if (guard) guard.style.display = 'none';
        if (main) main.style.display = 'block';
        if (footer) footer.style.display = 'block';

        // Show address in nav
        const addr = wallet.address || '0x...';
        const shortAddr = addr.length > 12
            ? `${addr.slice(0, 6)}...${addr.slice(-4)}`
            : addr;

        if (navAddr) navAddr.textContent = shortAddr;
    } else {
        // Not connected — show guard, hide dashboard
        if (guard) guard.style.display = 'flex';
        if (main) main.style.display = 'none';
        if (footer) footer.style.display = 'none';
    }

    // Disconnect handler
    if (btnDisconnect) {
        btnDisconnect.addEventListener('click', () => {
            sessionStorage.removeItem('aegis_wallet');
            window.location.href = 'index.html';
        });
    }
})();
