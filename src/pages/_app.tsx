import type { AppProps } from 'next/app'
import '../styles/globals.css'
import { StarknetProvider } from '@/components/starknet-provider'
import { NetworkProvider } from '@/contexts/NetworkContext'
import { useEffect } from 'react'
import { sessionKeyService } from '@/services/sessionKeyService'
import { transactionService } from '@/services/transactionService'

export default function App({ Component, pageProps }: AppProps) {
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

  return (
    <NetworkProvider>
      <StarknetProvider>
        <Component {...pageProps} />
      </StarknetProvider>
    </NetworkProvider>
  )
}
