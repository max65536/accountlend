"use client";
import React, { useState, useEffect } from 'react';
import { useAccount } from '@starknet-react/core';
import { useNetwork } from '../contexts/NetworkContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, X, ExternalLink, RefreshCw } from 'lucide-react';

// Network detection utility
const detectWalletNetwork = async (account: any) => {
  if (!account) return null;
  
  try {
    console.log('🔍 Detecting wallet network for account:', account);
    
    // Try multiple ways to get chain ID
    let chainId = account.chainId;
    
    // If chainId is not available directly, try to get it from the provider
    if (!chainId && account.provider) {
      try {
        const providerChainId = await account.provider.getChainId();
        chainId = providerChainId;
        console.log('📡 Got chainId from provider:', chainId);
      } catch (providerError) {
        console.warn('Failed to get chainId from provider:', providerError);
      }
    }
    
    // If still no chainId, try to call a method that might reveal it
    if (!chainId) {
      try {
        // Try to get network info
        const networkInfo = await account.getChainId?.();
        chainId = networkInfo;
        console.log('🌐 Got chainId from getChainId():', chainId);
      } catch (networkError) {
        console.warn('Failed to get chainId from getChainId():', networkError);
      }
    }
    
    console.log('🔗 Final chainId:', chainId, 'Type:', typeof chainId);
    
    // Starknet chain IDs - support both string and number formats
    const MAINNET_CHAIN_IDS = [
      '0x534e5f4d41494e', // SN_MAIN (hex string)
      'SN_MAIN', // String format
      '23448594291968334', // Decimal format
      23448594291968334 // Number format
    ];
    
    const SEPOLIA_CHAIN_IDS = [
      '0x534e5f5345504f4c4941', // SN_SEPOLIA (hex string)
      'SN_SEPOLIA', // String format
      '1536727068981429685321', // Decimal format
      1536727068981429685321 // Number format (might be BigInt)
    ];
    
    // Convert chainId to string for comparison
    const chainIdStr = String(chainId);
    const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 16) : Number(chainId);
    
    console.log('🔍 Comparing chainId:', {
      original: chainId,
      string: chainIdStr,
      number: chainIdNum,
      hex: typeof chainId === 'number' ? '0x' + chainId.toString(16) : chainId
    });
    
    // Check for mainnet
    if (MAINNET_CHAIN_IDS.some(id => 
      String(id) === chainIdStr || 
      id === chainId || 
      (typeof id === 'number' && id === chainIdNum)
    )) {
      console.log('✅ Detected MAINNET');
      return 'mainnet';
    }
    
    // Check for sepolia
    if (SEPOLIA_CHAIN_IDS.some(id => 
      String(id) === chainIdStr || 
      id === chainId || 
      (typeof id === 'number' && id === chainIdNum)
    )) {
      console.log('✅ Detected SEPOLIA');
      return 'sepolia';
    }
    
    console.log('❓ Unknown network detected');
    return 'unknown';
  } catch (error) {
    console.error('❌ Failed to detect wallet network:', error);
    return null;
  }
};

export function NetworkSwitcher() {
  const { currentNetwork, switchNetwork, isMainnet, isTestnet } = useNetwork();
  const { account } = useAccount();
  const [walletNetwork, setWalletNetwork] = useState<string | null>(null);
  const [showNetworkWarning, setShowNetworkWarning] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Detect wallet network when account changes
  useEffect(() => {
    const detectNetwork = async () => {
      if (account) {
        setIsDetecting(true);
        const network = await detectWalletNetwork(account);
        setWalletNetwork(network);
        setIsDetecting(false);
        
        // Show warning if wallet is on mainnet but app expects testnet
        if (network === 'mainnet' && isTestnet) {
          setShowNetworkWarning(true);
        } else {
          setShowNetworkWarning(false);
        }
      } else {
        setWalletNetwork(null);
        setShowNetworkWarning(false);
      }
    };

    detectNetwork();
  }, [account, isTestnet]);

  const handleSwitchToTestnet = () => {
    // Instructions for switching network in wallet
    const instructions = `
Please switch to Sepolia Testnet in your wallet:

Argent X Wallet:
1. Click the settings icon in the top-right corner
2. Select "Network"
3. Choose "Sepolia testnet"

Braavos Wallet:
1. Click the network name at the top
2. Select "Sepolia testnet" from the dropdown

Please refresh the page after switching.
    `;
    
    alert(instructions);
  };

  const refreshNetworkDetection = async () => {
    if (account) {
      setIsDetecting(true);
      const network = await detectWalletNetwork(account);
      setWalletNetwork(network);
      setIsDetecting(false);
    }
  };

  // Only show wallet network status when account is connected
  if (!account) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Network:</span>
      <div className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-2 font-medium shadow-sm border transition-all duration-200 ${
        walletNetwork === 'sepolia' 
          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
          : walletNetwork === 'mainnet'
          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
      }`}>
        <div className={`w-2.5 h-2.5 rounded-full ${
          walletNetwork === 'sepolia' ? 'bg-green-500' :
          walletNetwork === 'mainnet' ? 'bg-red-500' : 'bg-gray-500'
        }`} />
        {isDetecting ? (
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3 h-3 animate-spin" />
            Detecting...
          </div>
        ) : (
          walletNetwork === 'sepolia' ? 'Sepolia Testnet' :
          walletNetwork === 'mainnet' ? 'Mainnet' : 'Unknown Network'
        )}
      </div>
    </div>
  );
}
