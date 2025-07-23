"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Network = 'mainnet' | 'testnet';

interface NetworkContextType {
  currentNetwork: Network;
  switchNetwork: (network: Network) => void;
  isMainnet: boolean;
  isTestnet: boolean;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function useNetwork() {
  const context = useContext(NetworkContext);
  if (context === undefined) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
}

interface NetworkProviderProps {
  children: ReactNode;
}

export function NetworkProvider({ children }: NetworkProviderProps) {
  // Initialize with testnet as default, but check localStorage for saved preference
  const [currentNetwork, setCurrentNetwork] = useState<Network>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('accountlend-network');
      return (saved as Network) || 'testnet';
    }
    return 'testnet';
  });

  // Save network preference to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('accountlend-network', currentNetwork);
    }
  }, [currentNetwork]);

  const switchNetwork = (network: Network) => {
    setCurrentNetwork(network);
    // Reload the page to apply network changes
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const value: NetworkContextType = {
    currentNetwork,
    switchNetwork,
    isMainnet: currentNetwork === 'mainnet',
    isTestnet: currentNetwork === 'testnet',
  };

  return (
    <NetworkContext.Provider value={value}>
      {children}
    </NetworkContext.Provider>
  );
}
