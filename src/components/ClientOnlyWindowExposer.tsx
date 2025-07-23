"use client";
import { ReactNode, useEffect, useRef } from "react";
import { useAccount, useProvider } from "@starknet-react/core";
import { sessionKeyService } from '@/services/sessionKeyService';
import { transactionService } from '@/services/transactionService';

interface ClientOnlyWindowExposerProps {
  children?: ReactNode;
}

export default function ClientOnlyWindowExposer({ children }: ClientOnlyWindowExposerProps) {
  const { account, status } = useAccount();
  const { provider } = useProvider();
  const lastStatusRef = useRef<string>('');
  const lastAccountRef = useRef<string>('');
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Expose services to window for console testing
    if (typeof window !== 'undefined') {
      (window as any).sessionKeyService = sessionKeyService;
      (window as any).transactionService = transactionService;
      
      // Create console-friendly wrapper functions
      (window as any).createSessionKey = async (data: {
        description: string;
        price: string;
        duration: number;
        permissions: string[];
      }) => {
        const account = (window as any).starknetAccount;
        if (!account) {
          throw new Error('No wallet connected. Please connect your wallet first.');
        }
        return await sessionKeyService.createSessionKey(
          account,
          data.duration,
          data.permissions,
          data.price,
          data.description
        );
      };

      (window as any).getAllStoredSessionKeys = () => {
        const account = (window as any).starknetAccount;
        if (!account) {
          console.warn('No wallet connected. Returning empty array.');
          return [];
        }
        return sessionKeyService.getStoredSessionKeys(account.address);
      };

      (window as any).validateSessionKey = async (sessionKey: any) => {
        return await sessionKeyService.validateSessionKey(sessionKey);
      };

      (window as any).hasPermission = (sessionKey: any, permission: string) => {
        return sessionKey.permissions.includes(permission);
      };

      (window as any).createMockSessionKeys = () => {
        const account = (window as any).starknetAccount;
        if (!account) {
          throw new Error('No wallet connected. Please connect your wallet first.');
        }
        return sessionKeyService.createMockSessionKeys(account.address);
      };
      
      // Also expose some utility functions for debugging
      (window as any).debugSessionKeys = () => {
        const account = (window as any).starknetAccount;
        if (!account) {
          console.warn('No wallet connected.');
          return [];
        }
        const keys = sessionKeyService.getStoredSessionKeys(account.address);
        console.log('All stored session keys:', keys);
        return keys;
      };
      
      (window as any).debugTransactions = () => {
        const transactions = transactionService.getTransactions();
        console.log('All stored transactions:', transactions);
        return transactions;
      };

      (window as any).getTransactionStats = () => {
        return transactionService.getTransactionStats();
      };

      (window as any).getNotifications = () => {
        return transactionService.getNotifications();
      };

      (window as any).clearNotifications = () => {
        transactionService.clearNotifications();
        console.log('All notifications cleared');
      };

      (window as any).getSessionKeyStats = () => {
        const account = (window as any).starknetAccount;
        if (!account) {
          console.warn('No wallet connected.');
          return null;
        }
        return sessionKeyService.getSessionKeyStats(account.address);
      };
      
      console.log('🔧 Debug services exposed to window:');
      console.log('- window.sessionKeyService (raw service)');
      console.log('- window.transactionService (raw service)');
      console.log('- window.createSessionKey(data)');
      console.log('- window.getAllStoredSessionKeys()');
      console.log('- window.validateSessionKey(sessionKey)');
      console.log('- window.hasPermission(sessionKey, permission)');
      console.log('- window.createMockSessionKeys()');
      console.log('- window.debugSessionKeys()');
      console.log('- window.debugTransactions()');
      console.log('- window.getSessionKeyStats()');
      console.log('- window.getTransactionStats()');
      console.log('- window.getNotifications()');
      console.log('- window.clearNotifications()');
    }
  }, []);

  useEffect(() => {
    // Expose account and provider to window for console testing
    if (typeof window !== 'undefined') {
      if (status === 'connected' && account) {
        // Clear any pending disconnection timeout
        if (disconnectTimeoutRef.current) {
          clearTimeout(disconnectTimeoutRef.current);
          disconnectTimeoutRef.current = null;
        }

        // Only log if this is a new connection or the account changed
        const currentAccount = (window as any).starknetAccount;
        if (!currentAccount || currentAccount.address !== account.address) {
          console.log('🔗 Wallet connected and exposed to window:', account.address);
        }
        
        (window as any).starknetAccount = account;
        (window as any).starknetProvider = provider;
        lastStatusRef.current = status;
        lastAccountRef.current = account.address;
      } else if (status === 'disconnected') {
        // Only process disconnection if we were previously connected
        // and add a delay to avoid false disconnections during navigation
        if (lastStatusRef.current === 'connected' && lastAccountRef.current) {
          // Clear any existing timeout
          if (disconnectTimeoutRef.current) {
            clearTimeout(disconnectTimeoutRef.current);
          }

          // Set a timeout to delay the disconnection processing
          disconnectTimeoutRef.current = setTimeout(() => {
            // Double-check the status after the delay
            if (status === 'disconnected') {
              const hadAccount = !!(window as any).starknetAccount;
              (window as any).starknetAccount = undefined;
              (window as any).starknetProvider = provider;
              
              if (hadAccount) {
                console.log('🔌 Wallet disconnected');
              }
              
              lastStatusRef.current = status;
              lastAccountRef.current = '';
            }
          }, 500); // 500ms delay to avoid false disconnections
        }
      }
      // For other statuses (connecting, reconnecting), don't change anything
      // but update the ref if it's a meaningful status
      if (status !== 'disconnected' && status !== 'connected') {
        lastStatusRef.current = status;
      }
    }
  }, [account, status, provider]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
    };
  }, []);

  return <>{children}</>;
}
