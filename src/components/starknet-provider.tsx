"use client";
import { ReactNode } from "react";

import { mainnet } from "@starknet-react/chains";
import {
  StarknetConfig,
  argent,
  braavos,
  publicProvider,
  useInjectedConnectors,
} from "@starknet-react/core";
import { getCurrentNetwork } from "../config/contracts";

// Custom Sepolia testnet configuration
const sepolia = {
  id: BigInt("0x534e5f5345504f4c4941"), // SN_SEPOLIA
  network: "sepolia" as const,
  name: "Starknet Sepolia Testnet",
  nativeCurrency: {
    address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7" as const,
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  testnet: true,
  rpcUrls: {
    alchemy: {
      http: ["https://starknet-sepolia.g.alchemy.com/v2"] as const,
    },
    infura: {
      http: ["https://starknet-sepolia.infura.io/v3"] as const,
    },
    blast: {
      http: ["https://starknet-sepolia.public.blastapi.io"] as const,
    },
    default: {
      http: [] as const,
    },
    public: {
      http: ["https://starknet-sepolia.public.blastapi.io"] as const,
    },
  },
} as const;

export function StarknetProvider({ children }: { children: ReactNode }) {
  const { connectors } = useInjectedConnectors({
    // Show these connectors if the user has no connector installed.
    recommended: [argent(), braavos()],
    // Hide recommended connectors if the user has any connector installed.
    includeRecommended: "onlyIfNoConnectors",
    // Randomize the order of the connectors.
    order: "random",
  });

  // Dynamically select chains based on current network configuration
  const currentNetwork = getCurrentNetwork();
  const chains = currentNetwork === 'mainnet' ? [mainnet] : [mainnet, sepolia];

  return (
    <StarknetConfig
      chains={chains}
      provider={publicProvider()}
      connectors={connectors}
    >
      {children}
    </StarknetConfig>
  );
}
