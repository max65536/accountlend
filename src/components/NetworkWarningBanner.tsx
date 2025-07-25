"use client";
import React, { useState, useEffect } from 'react';
import { useAccount } from '@starknet-react/core';
import { useNetwork } from '../contexts/NetworkContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, X, ExternalLink, RefreshCw } from 'lucide-react';

// Network detection utility (same as in NetworkSwitcher)
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

export function NetworkWarningBanner() {
  const { isTestnet } = useNetwork();
  const { account } = useAccount();
  const [walletNetwork, setWalletNetwork] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Detect wallet network when account changes
  useEffect(() => {
    const detectNetwork = async () => {
      if (account) {
        setIsDetecting(true);
        const network = await detectWalletNetwork(account);
        setWalletNetwork(network);
        setIsDetecting(false);
        
        // Show warning if wallet is on mainnet but app expects testnet
        if (network === 'mainnet' && isTestnet && !isDismissed) {
          setShowWarning(true);
        } else {
          setShowWarning(false);
        }
      } else {
        setWalletNetwork(null);
        setShowWarning(false);
      }
    };

    detectNetwork();
  }, [account, isTestnet, isDismissed]);

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

  const handleDismiss = () => {
    setShowWarning(false);
    setIsDismissed(true);
  };

  // Don't render anything if no warning should be shown
  if (!showWarning) {
    return null;
  }

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <Card className="border-l-4 border-l-amber-500 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-bold text-amber-900 text-base">
                      Network Mismatch
                    </h4>
                    <div className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      Action Required
                    </div>
                  </div>
                  <p className="text-amber-800 text-sm leading-relaxed mb-3">
                    Your wallet is connected to <strong>Starknet Mainnet</strong>, but AccountLend's smart contracts 
                    are deployed on <strong>Sepolia Testnet</strong>. Please switch to testnet for full functionality.
                  </p>
                  <div className="bg-white/60 rounded-lg p-3 mb-3">
                    <h5 className="font-semibold text-amber-900 text-sm mb-2">Quick Switch Guide:</h5>
                    <div className="grid md:grid-cols-2 gap-2 text-xs text-amber-800">
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 bg-blue-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-blue-600 font-bold text-xs">A</span>
                        </div>
                        <div>
                          <strong>Argent X:</strong> Click account name → network name → Sepolia testnet
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-4 h-4 bg-purple-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-purple-600 font-bold text-xs">B</span>
                        </div>
                        <div>
                          <strong>Braavos:</strong> Click top right button → choose Sepolia testnet
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={handleSwitchToTestnet}
                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Detailed Guide
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={refreshNetworkDetection}
                      disabled={isDetecting}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100 bg-white/80"
                    >
                      <RefreshCw className={`w-3 h-3 mr-1 ${isDetecting ? 'animate-spin' : ''}`} />
                      {isDetecting ? 'Checking...' : 'Refresh'}
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-amber-600 hover:text-amber-800 hover:bg-amber-100/80 p-1 rounded-full flex-shrink-0"
                title="Dismiss warning"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
