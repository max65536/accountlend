"use client";
import { useAccount, useConnect, useDisconnect } from "@starknet-react/core";
import { useMemo } from "react";
import { Wallet, LogOut, Copy } from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

function WalletConnected() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  const shortenedAddress = useMemo(() => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [address]);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant="success" className="flex items-center gap-1">
        <Wallet className="w-3 h-3" />
        {shortenedAddress}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        onClick={copyAddress}
        className="h-8 w-8 p-0"
      >
        <Copy className="w-3 h-3" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => disconnect()}
        className="flex items-center gap-1"
      >
        <LogOut className="w-3 h-3" />
        Disconnect
      </Button>
    </div>
  );
}

function ConnectWallet() {
  const { connectors, connect } = useConnect();

  return (
    <div className="flex items-center gap-2">
      {connectors.map((connector) => {
        return (
          <Button
            key={connector.id}
            onClick={() => connect({ connector })}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            {connector.id}
          </Button>
        );
      })}
    </div>
  );
}

export default function WalletBar() {
  const { address } = useAccount();

  return address ? <WalletConnected /> : <ConnectWallet />;
}
