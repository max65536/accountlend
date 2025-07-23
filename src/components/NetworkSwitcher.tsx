"use client";
import React from 'react';
import { useNetwork } from '../contexts/NetworkContext';

export function NetworkSwitcher() {
  const { currentNetwork, switchNetwork, isMainnet, isTestnet } = useNetwork();

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">Network:</span>
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <button
          onClick={() => switchNetwork('testnet')}
          className={`px-3 py-1 text-sm rounded-md transition-all duration-200 ${
            isTestnet
              ? 'bg-blue-500 text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-green-400' : 'bg-gray-400'}`} />
            Sepolia
          </div>
        </button>
        <div className="relative group">
          <button
            disabled
            className={`px-3 py-1 text-sm rounded-md transition-all duration-200 cursor-not-allowed opacity-50 ${
              isMainnet
                ? 'bg-purple-500 text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isMainnet ? 'bg-green-400' : 'bg-gray-400'}`} />
              Mainnet
            </div>
          </button>
          {/* Tooltip */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
            ⚠️ Contracts not deployed
          </div>
        </div>
      </div>
    </div>
  );
}
