# Aegis: Autonomous ZK-Infrastructure Sentinel 🛡️🤖

Aegis is an elite autonomous agent designed to secure digital human rights by identifying, proving, and archiving sensitive data permanently. Built for the **PL_Genesis 2026 Hackathon**, Aegis operates at the intersection of Decentralized Infrastructure, Privacy-Preserving Cryptography, and Autonomous AI.

## 🧩 The 5-Stage "Puzzle" Architecture

Aegis follows a sophisticated autonomous loop, delegating tasks across five industry-leading tech stacks:

1.  **Intelligence (Impulse AI)**: Uses an ML-driven classification engine to autonomously discover and categorize "Sensitive" data (PII, Financial, etc.) that requires protection.
2.  **Digital Rights (Noir ZK-Proofs)**: Generates a Zero-Knowledge proof of integrity for discovered data. This ensures the data is "Real" and "Untampered" without ever disclosing its actual contents.
3.  **Infrastructure (Arweave via Irys)**: Commits the cryptographically secured data to permanent, censorship-resistant storage.
4.  **Identity (ERC-8004)**: Registers and verifies the agent's identity on the Ethereum Sepolia registry, providing a transparent audit trail linked to an operator.
5.  **Impact Evaluation (Hypercerts)**: Issues a verifiable on-chain "Impact Receipt" for every successful archival action, creating a permanent reputation for the agent's contributions.

---

## 🛠️ Tech Stack & Bounties

| Layer | Technology | Challenge / Bounty |
| :--- | :--- | :--- |
| **Autonomy** | Python (Main Engine) | [Ethereum Foundation] **Agent Only** |
| **Intelligence** | Impulse AI | [Impulse AI] **Autonomous ML** |
| **Privacy** | Noir (ZK-Proofs) | [Protocol Labs] **Digital Rights** |
| **Infrastructure** | Arweave (Irys SDK) | [Protocol Labs] **Infrastructure** |
| **Identity** | ERC-8004 | [Ethereum Foundation] **Agents With Receipts** |
| **Impact** | Hypercerts | [Hypercerts] **Impact Evaluation** |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- Python 3.10+
- Private Key for Sepolia ETH & Irys funding

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/IrrhammCode/AegisAgent.git
   cd AegisAgent
   ```

2. Install dependencies:
   ```bash
   npm install
   pip install -r requirements.txt
   ```

3. Setup environment variables:
   ```bash
   cp .env.example .env
   # Add your ETH_RPC_URL and OPERATOR_PRIVATE_KEY
   ```

### Running the Agent
To start the autonomous loop:
```bash
python main.py
```

To run a single test cycle:
```bash
python main.py --once
```

---

## 📊 Outputs & Transparency
- **`agent.json`**: Machine-readable capability manifest (DevSpot Compatible).
- **`agent_log.json`**: Structured autonomous execution logs detailing every decision and tool call.
- **`vault_data/`**: Local directory for the agent to monitor and protect.

---

## ⚖️ License
MIT License - 2026 Aegis Team.
