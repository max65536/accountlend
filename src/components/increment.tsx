import { useAccount, useContractWrite } from "@starknet-react/core"
import { useState, useMemo, useCallback } from "react"


const addrETH = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

export default function AddComponent() {
    const { address } = useAccount()
    const [count, setCount] = useState(0)
   
    const calls = useMemo(() => {
      const tx = {
        contractAddress: addrETH,
        entrypoint: 'transfer',
        calldata: [address, 1, 0]
      }
      return Array(count).fill(tx)
    }, [address, count])
  
    const { write } = useContractWrite({ calls })
  
    const writeTransaction = () => {
        write(); // 直接调用 write，不传入任何参数
      };

    const inc = useCallback(
      () => setCount(c => c + 1),
      [setCount]
    )
    const dec = useCallback(
      () => setCount(c => Math.max(c - 1, 0)),
      [setCount]
    )
  
    return (
      <>
        <p>Sending {count} transactions</p>
        <p>
          <button onClick={dec}>Decrement</button>
          <button onClick={inc}>Increment</button>
        </p>
        <p>
          <button onClick={writeTransaction}>Write</button>
        </p>
      </>
    )
  }