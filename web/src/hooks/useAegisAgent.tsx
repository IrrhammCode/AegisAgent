import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';

import { Github, Cloud, Laptop, FileText, MessageSquare } from 'lucide-react';

/* ─── Types ────────────────────────────────────────── */
export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'error' | 'system';
}

export interface Asset {
  id: string;
  name: string;
  category: 'IP_CODE' | 'IP_MEDIA' | 'PII_DATA' | 'FINANCIAL' | 'GENERAL';
  source: string;
  status: 'PROTECTED';
  txHash: string;
  impactId: string;
}

export interface ScanTarget {
  id: string;
  label: string;
  icon: any;
  description: string;
  isComingSoon?: boolean;
}

/* ─── Constants ────────────────────────────────────── */
export const AVAILABLE_TARGETS: ScanTarget[] = [
  { id: 'github', label: 'GitHub Private Repos', icon: Github, description: 'Scan private repositories for proprietary source code & secrets' },
  { id: 'local', label: 'Local Machine', icon: Laptop, description: 'Scan local filesystem for unprotected intellectual property' },
  { id: 'gdrive', label: 'Google Drive', icon: Cloud, description: 'Coming Soon: Scan corporate drive for documentation', isComingSoon: true },
  { id: 'notion', label: 'Notion Workspace', icon: FileText, description: 'Coming Soon: Scan workspace pages for trade secrets', isComingSoon: true },
  { id: 'slack', label: 'Slack Export', icon: MessageSquare, description: 'Coming Soon: Scan exported messages for PII', isComingSoon: true },
];

const AGENT_ID = 'AEGIS-MMTD7S82';
const MAX_COMPUTE_BUDGET = 500000;

/* ─── Context Shape ────────────────────────────────── */
interface AegisAgentState {
  logs: LogEntry[];
  assets: Asset[];
  activeStage: number;
  isConnected: boolean;
  isDeployed: boolean;
  isRunning: boolean;
  awaitingMint: boolean;
  selectedTargets: string[];
  gasUsed: number;
  computeBudget: number;
  agentId: string;
  address: string | undefined;
  deployAgent: (targets: string[], config?: any) => void;
  resetAgent: () => void;
  completeMint: (assetId: string) => void;
}

const AegisAgentContext = createContext<AegisAgentState | null>(null);

/* ─── Provider ─────────────────────────────────────── */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

export const AegisAgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { address, isConnected } = useAccount();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeStage, setActiveStage] = useState(-1);
  const [isDeployed, setIsDeployed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [awaitingMint, setAwaitingMint] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [gasUsed, setGasUsed] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const now = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  };

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setLogs(prev => [...prev, { timestamp: now(), message, type }]);
  }, []);

  const deployAgent = useCallback(async (targets: string[], config?: any) => {
    if (targets.length === 0) return;
    setSelectedTargets(targets);
    setIsDeployed(true);
    setIsRunning(true);
    setAssets([]);
    setLogs([]);
    setActiveStage(0);
    setGasUsed(0);

    // Clear any existing polling timers
    timersRef.current.forEach(t => clearInterval(t));
    timersRef.current = [];

    try {
      // 1. Trigger deployment
      await fetch(`${API_BASE_URL}/api/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targets, config })
      });

      // 2. Start polling for logs
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/api/logs`);
          if (!res.ok) return;
          const rawLogs = await res.json();
          
          if (!Array.isArray(rawLogs) || rawLogs.length === 0) return;

          // Map raw backend logs to frontend LogEntry format
          const formattedLogs: LogEntry[] = rawLogs.map((entry: any) => {
            let type: LogEntry['type'] = 'info';
            if (entry.status === 'SUCCESS') type = 'success';
            if (entry.status === 'ERROR') type = 'error';
            if (entry.status === 'HALTED' || entry.status === 'SKIPPED') type = 'warn';
            if (entry.step === 'STARTUP' || entry.step === 'SHUTDOWN') type = 'system';

            const timeStr = new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false });
            return {
              timestamp: timeStr,
              message: `[${entry.step}] ${entry.decision}`,
              type
            };
          });

          // Extract verified assets from logs (MUST be before SHUTDOWN check)
          const newAssets: Asset[] = [];
          rawLogs.forEach((entry: any) => {
            if (entry.step === 'VERIFY' && entry.status === 'SUCCESS') {
              const details = entry.details || {};
              const decision = entry.decision || "";
              const filenameMatch = decision.match(/verified for (.*)/);
              const filename = filenameMatch ? filenameMatch[1] : 'Unknown File';
              
              const storageUrl = details.storage_url || "";
              const txHashStr = storageUrl.split('/').pop() || '0x...';
              const shortTx = txHashStr !== '0x...' ? `${txHashStr.substring(0, 6)}...${txHashStr.substring(txHashStr.length - 4)}` : '0x...';

              newAssets.push({
                id: details.file_hash || Math.random().toString(),
                name: filename,
                category: details.classification || 'GENERAL',
                source: 'Local FS',
                status: 'PROTECTED',
                txHash: shortTx,
                impactId: details.impact_token || 'HC-PENDING'
              });
            }
          });

          // Determine Active Stage based on the latest log's step
          const latestLog = rawLogs[rawLogs.length - 1];
          if (latestLog) {
            const stepMap: Record<string, number> = {
              'STARTUP': 0, 'DISCOVER': 0,
              'PLAN': 1,
              'EXECUTE': 2,
              'VERIFY': 3, 'ARCHIVE': 3,
              'SUBMIT': 4, 'SHUTDOWN': 4
            };
            if (stepMap[latestLog.step] !== undefined) {
              setActiveStage(stepMap[latestLog.step]);
            }
            if (latestLog.step === 'SHUTDOWN') {
              // Check if any assets have HC-PENDING — if so, stay alive for wallet signing
              const hasPending = newAssets.some(a => a.impactId === 'HC-PENDING');
              if (hasPending) {
                setAwaitingMint(true);
                setActiveStage(4); // Stay on "Certify" stage
                // Keep isRunning = true so dashboard stays active
              } else {
                setIsRunning(false);
                setAwaitingMint(false);
              }
              clearInterval(pollInterval);
            }
          }

          setLogs(formattedLogs);
          setAssets(newAssets);
          // Fake gas calculation for demo purposes mapping to log length
          setGasUsed(rawLogs.length * 15000);

        } catch (err) {
          console.error("Failed to fetch logs:", err);
        }
      }, 1000);

      timersRef.current.push(pollInterval);

    } catch (error) {
      console.error("Failed to deploy agent:", error);
      addLog("[ERROR] Failed to connect to Aegis API backend.", "error");
      setIsRunning(false);
    }
  }, [addLog]);

  const completeMint = useCallback((assetId: string) => {
    setAssets(prev => {
      const updated = prev.map(a => a.id === assetId ? { ...a, impactId: 'HC-MINTED' } : a);
      const stillPending = updated.some(a => a.impactId === 'HC-PENDING');
      if (!stillPending) {
        setAwaitingMint(false);
        setIsRunning(false); // Pipeline complete — all certs minted
        setActiveStage(5); // Move to final "Swarm" stage
      }
      return updated;
    });
  }, []);

  const resetAgent = useCallback(async () => {
    timersRef.current.forEach(t => clearInterval(t));
    timersRef.current = [];
    setLogs([]);
    setAssets([]);
    setActiveStage(-1);
    setIsDeployed(false);
    setIsRunning(false);
    setAwaitingMint(false);
    setSelectedTargets([]);
    setGasUsed(0);
    try {
      await fetch(`${API_BASE_URL}/api/reset`, { method: 'POST' });
    } catch(e) { /* ignore */ }
  }, []);

  // Set up SSE Event Source for auto-triggering
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/events`);
    
    eventSource.addEventListener('auto_trigger', (e) => {
      try {
        const data = JSON.parse(e.data);
        console.log("Auto-triggering agent:", data);
        addLog(`[SYSTEM] ${data.reason}`, 'system');
        // Only run if not already running to prevent overlap
        if (!isRunning) {
          deployAgent([data.target || 'local']);
        }
      } catch (err) {
        console.error("Failed to parse SSE data", err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, [deployAgent, isRunning, addLog]);

  return (
    <AegisAgentContext.Provider value={{
      logs, assets, activeStage,
      isConnected, isDeployed, isRunning,
      awaitingMint,
      selectedTargets, gasUsed,
      computeBudget: MAX_COMPUTE_BUDGET,
      agentId: AGENT_ID,
      address,
      deployAgent, resetAgent, completeMint,
    }}>
      {children}
    </AegisAgentContext.Provider>
  );
};

/* ─── Hook ─────────────────────────────────────────── */
export const useAegisAgent = () => {
  const ctx = useContext(AegisAgentContext);
  if (!ctx) throw new Error('useAegisAgent must be used within AegisAgentProvider');
  return ctx;
};
