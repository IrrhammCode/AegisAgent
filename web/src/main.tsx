import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { AegisAgentProvider } from './hooks/useAegisAgent';
import './index.css';

const config = getDefaultConfig({
  appName: 'AegisAgent',
  projectId: 'PLACEHOLDER_PROJECT_ID', // User can replace with their own Reown project ID
  chains: [sepolia],
  ssr: false, 
});

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#00F0FF',
          accentColorForeground: '#000000',
          borderRadius: 'small',
          fontStack: 'system',
          overlayBlur: 'small',
        })}>
          <AegisAgentProvider>
            <App />
          </AegisAgentProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
