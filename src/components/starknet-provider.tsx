"use client";
import { ReactNode, useEffect, useRef } from "react";

import { goerli, mainnet } from "@starknet-react/chains";
import {
  StarknetConfig,
  argent,
  braavos,
  publicProvider,
  useInjectedConnectors,
  useAccount,
  useProvider,
} from "@starknet-react/core";

function WindowExposer({ children }: { children: ReactNode }) {
  const { account, status } = useAccount();
  const { provider } = useProvider();
  const lastStatusRef = useRef<string>('');
  const lastAccountRef = useRef<string>('');
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

export function StarknetProvider({ children }: { children: ReactNode }) {
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [argent(), braavos()],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: "onlyIfNoConnectors",
    // Randomize the order of the connectors.
    order: "random",
  });

  return (
    <StarknetConfig
      chains={[mainnet, goerli]}
      provider={publicProvider()}
      connectors={connectors}
    >
      <WindowExposer>
        {children}
      </WindowExposer>
    </StarknetConfig>
  );
}
