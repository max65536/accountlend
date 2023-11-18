"use client";
import {
    useAccount,
    useContract,
    useContractWrite,
    useNetwork,
  } from "@starknet-react/core";

const argentAccountClassHash = "0x1a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003";
const argentAccountClassHash_rc2 = "0x45bb3b296122454fb31d45c48da6143df12bcf58311dcd75193df42d79f8dd2";

  function handleTransaction() {
    const { address } = useAccount();
    const { chain } = useNetwork();
  
    const { contract } = useContract({
      abi: erc20ABI,
      address: chain.nativeCurrency.address,
    });
  }

export default function sendTransaction() {
    return (
        <div>
          <button onClick={handleTransaction}>发起交易</button>
        </div>
      )
  }
  