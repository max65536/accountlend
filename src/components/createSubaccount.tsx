import { useAccount } from "@starknet-react/core";



export default function SubAccountBar() {
    const { address } = useAccount();
    return address ? <WalletConnected /> : <ConnectWallet />;
  }
  