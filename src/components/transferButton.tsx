import { useContractWrite, useAccount, useContract } from '@starknet-react/core'
import { useMemo } from 'react';
import { stark } from 'starknet';
import data from "@/pages/ERC20ETH.json"

const abi = data
const addrETH = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

// export function transferButton() {
//   const { account } = useAccount()
//   const { contract } = useContract({ abi: abi, address: addrETH })
//   if (!contract) return;
  
//   contract.transfer("0x05AD3d3eDaf21d69586fF88899dD8279084342446B50B87D9e9F4B7DA5977a41", "0x01610Aba41F34F50ffc14DCd74c5e595eA23a22d9eeD6E37c503118Ee901f039", 10);

//   return (
//     <button
//       disabled={!account || isLoading}
//       onClick={() => write()}
//     >
//       Send Transaction
//     </button>
//   )
// }
export default function ShowAddress() {
    const { contract } = useContract({
      address: addrETH,
      abi: abi
    })
    if (!contract) return <div>no contract</div>
    return <span>{contract.address}</span>
  }