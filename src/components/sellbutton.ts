"use client"
import { check_balance } from "@/pages/interactERC20";
import { json, uint256 } from "starknet";
import * as fs from "fs";
import { useState, useMemo } from "react";

import {
    useAccount,
    useContract,
    useContractWrite,
    useNetwork,    
    useWaitForTransaction,
  } from "@starknet-react/core";
const abi = json.parse(fs.readFileSync("compiled_contracts/ERC20ETH.json").toString("ascii"));
const addrETH = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

function MyComponent() {
    const { address } = useAccount();
    const { chain } = useNetwork();
  
    const { contract } = useContract({
      abi: abi,
      address: addrETH,
    });

    const [count, setCount] = useState(1);

    const calls = useMemo(() => {
      if (!address || !contract) return [];
  
      return Array.from({ length: count }, (_, i) => {
        const amount = uint256.bnToUint256(BigInt(i));
        return contract.populateTransaction["transfer"]!(address, amount);
      });
    }, [contract, address, count]);
  
    const {
      write,
      reset,
      data: tx,
      isError: isSubmitError,
      error: submitError,
    } = useContractWrite({
      calls,
    });   

    const {
        data: receipt,
        isLoading,
        isError,
        error,
      } = useWaitForTransaction({
        hash: tx?.transaction_hash,
        watch: true,
        retry: true,
        refetchInterval: 2000,
      });
    
  }