/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  AEGIS ZK-SENTINEL — Dashboard Application                  ║
 * ║  Interactive frontend for the autonomous guardian agent.     ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

// ─── Sample Agent Data ───────────────────────────────────────
// In production, this would come from agent_log.json via a local API.
// For the hackathon demo, we embed realistic data directly.

const SAMPLE_LOG = [
    { timestamp: "2026-03-16T22:54:41.001Z", cycle: 1, step: "STARTUP", decision: "Aegis Autonomous Brain initialized.", details: { mode: "single_cycle", vault_dir: "./vault_data" }, status: "SUCCESS" },
    { timestamp: "2026-03-16T22:54:41.050Z", cycle: 1, step: "DISCOVER", decision: "Found 2 new item(s) in vault.", details: { total_items: 2 }, status: "SUCCESS" },
    { timestamp: "2026-03-16T22:54:41.051Z", cycle: 1, step: "PLAN", decision: "Planned 2 task(s) for execution.", details: { plan_size: 2, files: ["defi_portfolio_backup.json", "user_identity_shard_1.json"] }, status: "SUCCESS" },
    { timestamp: "2026-03-16T22:54:41.052Z", cycle: 1, step: "EXECUTE", decision: "Initiating protection for: defi_portfolio_backup.json", details: { file: "defi_portfolio_backup.json", size_bytes: 723 }, status: "SUCCESS" },
    { timestamp: "2026-03-16T22:54:41.100Z", cycle: 1, step: "VERIFY", decision: "Protection verified for defi_portfolio_backup.json", details: { agent_id: "AEGIS-MMTD7Q2X", storage_url: "https://arweave.net/DEMO_8f3a2b...", impact_token: "HC-A1B2C3D4E5F6", classification: "FINANCIAL", zk_verified: true, execution_time_ms: 48 }, status: "SUCCESS" },
    { timestamp: "2026-03-16T22:54:41.101Z", cycle: 1, step: "ARCHIVE", decision: "Moved defi_portfolio_backup.json → defi_portfolio_backup.json", details: {}, status: "SUCCESS" },
    { timestamp: "2026-03-16T22:54:41.110Z", cycle: 1, step: "EXECUTE", decision: "Initiating protection for: user_identity_shard_1.json", details: { file: "user_identity_shard_1.json", size_bytes: 541 }, status: "SUCCESS" },
    { timestamp: "2026-03-16T22:54:41.160Z", cycle: 1, step: "VERIFY", decision: "Protection verified for user_identity_shard_1.json", details: { agent_id: "AEGIS-MMTD6P9U", storage_url: "https://arweave.net/DEMO_94cc93...", impact_token: "HC-06177897FD33", classification: "CREDENTIALS", zk_verified: true, execution_time_ms: 62 }, status: "SUCCESS" },
    { timestamp: "2026-03-16T22:54:41.161Z", cycle: 1, step: "ARCHIVE", decision: "Moved user_identity_shard_1.json → user_identity_shard_1.json", details: {}, status: "SUCCESS" },
    { timestamp: "2026-03-16T22:54:41.200Z", cycle: 1, step: "SHUTDOWN", decision: "Aegis session completed.", details: { cycles: 1, completed: 2, failed: 0, bytes_protected: 1264, runtime_seconds: 2.0 }, status: "SUCCESS" }
];

const PROTECTED_ASSETS = [
    {
        file: "user_identity_shard_1.json",
        category: "CREDENTIALS",
        zkVerified: true,
        txId: "DEMO_94cc935a4d45b8d0",
        txUrl: "https://arweave.net/DEMO_94cc935a4d45b8d0",
        impactToken: "HC-06177897FD33",
        time: "2026-03-16T22:54:41Z",
        confidence: 0.97,
        sizeBytes: 541
    },
    {
        file: "defi_portfolio_backup.json",
        category: "FINANCIAL",
        zkVerified: true,
        txId: "DEMO_8f3a2b1c4d5e6f70",
        txUrl: "https://arweave.net/DEMO_8f3a2b1c4d5e6f70",
        impactToken: "HC-A1B2C3D4E5F6",
        time: "2026-03-16T22:54:41Z",
        confidence: 0.94,
        sizeBytes: 723
    }
];

// ─── State ───────────────────────────────────────────────────

let state = {
    filesProtected: 0,
    zkProofs: 0,
    bytesArchived: 0,
    impactReceipts: 0,
    pipelineActive: false,
    currentStage: 0,
    logs: [],
    assets: []
};

// ─── DOM References ──────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ─── Initialization ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    loadAgentData();
    initButtons();
    initPipelineObserver();
});

// ─── Navigation ──────────────────────────────────────────────

function initNavigation() {
    const links = $$('.nav-link');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            links.forEach(l => l.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // Scroll-based active state
    const sections = ['dashboard', 'pipeline', 'logs', 'tech'];
    window.addEventListener('scroll', () => {
        const scrollY = window.scrollY + 100;
        for (const id of sections) {
            const el = document.getElementById(id);
            if (el && scrollY >= el.offsetTop && scrollY < el.offsetTop + el.offsetHeight) {
                links.forEach(l => l.classList.remove('active'));
                const activeLink = document.querySelector(`.nav-link[href="#${id}"]`);
                if (activeLink) activeLink.classList.add('active');
            }
        }
    });
}

// ─── Load Data ───────────────────────────────────────────────

function loadAgentData() {
    // Try to load from agent_log.json (local file)
    // For the demo, we use embedded sample data
    state.logs = SAMPLE_LOG;
    state.assets = PROTECTED_ASSETS;

    // Count stats from log data
    state.filesProtected = state.logs.filter(l => l.step === 'VERIFY' && l.status === 'SUCCESS').length;
    state.zkProofs = state.filesProtected; // 1 proof per file
    state.impactReceipts = state.filesProtected;
    state.bytesArchived = state.logs
        .filter(l => l.step === 'VERIFY')
        .reduce((sum, l) => sum + (l.details?.execution_time_ms || 0), 0);

    // Use bytes from assets instead
    state.bytesArchived = state.assets.reduce((sum, a) => sum + a.sizeBytes, 0);

    // Animate stats
    animateStats();

    // Render logs
    renderLogs();

    // Render assets table
    renderAssetsTable();
}

// ─── Animate Stats ───────────────────────────────────────────

function animateStats() {
    animateCounter('filesProtected', state.filesProtected);
    animateCounter('zkProofsGenerated', state.zkProofs);
    animateCounter('bytesArchived', state.bytesArchived);
    animateCounter('impactReceipts', state.impactReceipts);
}

function animateCounter(elementId, target) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const duration = 1500;
    const start = performance.now();
    const startVal = 0;

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(startVal + (target - startVal) * eased);

        if (elementId === 'bytesArchived') {
            el.textContent = formatBytes(current);
        } else {
            el.textContent = current.toLocaleString();
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function formatBytes(bytes) {
    if (bytes === 0) return '0';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ─── Render Logs ─────────────────────────────────────────────

function renderLogs() {
    const body = $('#terminalBody');
    if (!body) return;

    body.innerHTML = '';

    state.logs.forEach((entry, i) => {
        setTimeout(() => {
            const line = document.createElement('div');
            const logClass = getLogClass(entry.step, entry.status);
            line.className = `terminal-line ${logClass}`;

            const time = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false });

            line.innerHTML = `
                <span class="timestamp">[${time}]</span>
                <span class="message">${getLogIcon(entry.step, entry.status)} [${entry.step}] ${entry.decision}</span>
            `;

            body.appendChild(line);
            body.scrollTop = body.scrollHeight;
        }, i * 120);
    });
}

function getLogClass(step, status) {
    if (status === 'FAILED' || status === 'ERROR') return 'error';
    if (status === 'HALTED') return 'warn';
    if (step === 'STARTUP' || step === 'SHUTDOWN') return 'system';
    if (step === 'VERIFY') return 'success';
    if (step === 'DISCOVER' || step === 'PLAN') return 'info';
    return '';
}

function getLogIcon(step, status) {
    if (status === 'FAILED' || status === 'ERROR') return '❌';
    if (status === 'HALTED') return '🛑';
    const icons = {
        'STARTUP': '🚀', 'SHUTDOWN': '📋', 'DISCOVER': '🔍',
        'PLAN': '📝', 'EXECUTE': '⚡', 'VERIFY': '✅',
        'ARCHIVE': '📦', 'GUARDRAIL': '🛡️'
    };
    return icons[step] || '•';
}

// ─── Render Assets Table ─────────────────────────────────────

function renderAssetsTable() {
    const tbody = $('#assetsTableBody');
    const empty = $('#tableEmpty');
    if (!tbody) return;

    if (state.assets.length === 0) {
        if (empty) empty.classList.add('visible');
        return;
    }

    if (empty) empty.classList.remove('visible');
    tbody.innerHTML = '';

    state.assets.forEach(asset => {
        const tr = document.createElement('tr');
        const time = new Date(asset.time).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });

        tr.innerHTML = `
            <td>
                <div style="display:flex;flex-direction:column;gap:2px">
                    <strong style="color:var(--text-primary);font-size:13px">${asset.file}</strong>
                    <span style="font-size:11px;color:var(--text-muted)">${formatBytes(asset.sizeBytes)} • ${(asset.confidence * 100).toFixed(0)}% confidence</span>
                </div>
            </td>
            <td><span class="category-badge cat-${asset.category}">${asset.category}</span></td>
            <td><span class="zk-badge">✓ Verified</span></td>
            <td><a href="${asset.txUrl}" class="tx-link" target="_blank">${asset.txId.slice(0, 16)}...</a></td>
            <td><span class="impact-badge">${asset.impactToken}</span></td>
            <td style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted)">${time}</td>
        `;

        tbody.appendChild(tr);
    });
}

// ─── Button Handlers ─────────────────────────────────────────

function initButtons() {
    const btnRun = $('#btnRunCycle');
    const btnLogs = $('#btnViewLogs');
    const btnRefresh = $('#btnRefreshLogs');
    const btnClear = $('#btnClearLogs');

    if (btnRun) {
        btnRun.addEventListener('click', () => {
            runPipelineDemo();
        });
    }

    if (btnLogs) {
        btnLogs.addEventListener('click', () => {
            document.getElementById('logs')?.scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            renderLogs();
        });
    }

    if (btnClear) {
        btnClear.addEventListener('click', () => {
            const body = $('#terminalBody');
            if (body) {
                body.innerHTML = '<div class="terminal-line system"><span class="timestamp">[SYSTEM]</span><span class="message">Log cleared.</span></div>';
            }
        });
    }
}

// ─── Pipeline Demo Animation ─────────────────────────────────

function runPipelineDemo() {
    if (state.pipelineActive) return;
    state.pipelineActive = true;

    const stages = $$('.stage');
    const progress = $('#pipelineProgress');
    const btnRun = $('#btnRunCycle');

    if (btnRun) {
        btnRun.disabled = true;
        btnRun.textContent = '⏳ Running...';
    }

    // Reset
    stages.forEach(s => {
        s.classList.remove('active', 'completed');
    });
    if (progress) progress.style.height = '0%';

    // Add new log entries
    addLogEntry('DISCOVER', 'Scanning vault_data for new assets...', 'info');

    const stageNames = ['Intelligence', 'Privacy', 'Infrastructure', 'Identity', 'Impact'];
    const stageDetails = [
        'Impulse AI: Classifying sensitive_contract.pdf → FINANCIAL (95.2%)',
        'Noir ZK: Generating integrity proof... Verified in 45ms',
        'Irys/Arweave: Archiving → TX: DEMO_a7b8c9d0...',
        'ERC-8004: Agent AEGIS-NXT001 verified on Sepolia',
        'Hypercerts: Impact receipt HC-NEW001 minted'
    ];

    // Animate through stages
    stages.forEach((stage, i) => {
        setTimeout(() => {
            // Activate current stage
            stage.classList.add('active');

            // Update progress bar
            const pct = ((i + 1) / stages.length) * 100;
            if (progress) progress.style.height = `${pct}%`;

            // Add log entry
            addLogEntry('EXECUTE', `Stage ${i + 1} (${stageNames[i]}): ${stageDetails[i]}`, 'success');

            // Mark previous as completed
            if (i > 0) {
                stages[i - 1].classList.remove('active');
                stages[i - 1].classList.add('completed');
            }

            // Final stage completion
            if (i === stages.length - 1) {
                setTimeout(() => {
                    stage.classList.remove('active');
                    stage.classList.add('completed');

                    addLogEntry('VERIFY', '✅ Protection cycle complete! Asset secured on Arweave.', 'success');

                    // Update stats
                    state.filesProtected++;
                    state.zkProofs++;
                    state.impactReceipts++;
                    state.bytesArchived += 1548;

                    animateStats();

                    // Add new asset to table
                    state.assets.unshift({
                        file: 'sensitive_contract.pdf',
                        category: 'FINANCIAL',
                        zkVerified: true,
                        txId: 'DEMO_a7b8c9d0e1f2g3h4',
                        txUrl: 'https://arweave.net/DEMO_a7b8c9d0e1f2g3h4',
                        impactToken: 'HC-NEW001',
                        time: new Date().toISOString(),
                        confidence: 0.952,
                        sizeBytes: 1548
                    });
                    renderAssetsTable();

                    state.pipelineActive = false;
                    if (btnRun) {
                        btnRun.disabled = false;
                        btnRun.innerHTML = '<svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><polygon points="4,2 14,8 4,14"/></svg> Run Protection Cycle';
                    }
                }, 800);
            }
        }, (i + 1) * 1200);
    });
}

function addLogEntry(step, message, type = '') {
    const body = $('#terminalBody');
    if (!body) return;

    const line = document.createElement('div');
    line.className = `terminal-line ${type}`;

    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    line.innerHTML = `
        <span class="timestamp">[${time}]</span>
        <span class="message">${getLogIcon(step, 'SUCCESS')} [${step}] ${message}</span>
    `;

    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
}

// ─── Pipeline Scroll Observer ────────────────────────────────

function initPipelineObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Activate stages sequentially when pipeline comes into view
                const stages = $$('.stage');
                stages.forEach((stage, i) => {
                    setTimeout(() => {
                        stage.classList.add('active');
                        // Update progress
                        const progress = $('#pipelineProgress');
                        if (progress) {
                            progress.style.height = `${((i + 1) / stages.length) * 100}%`;
                        }
                    }, i * 300);
                });
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    const pipeline = document.querySelector('.pipeline-section');
    if (pipeline) observer.observe(pipeline);
}
