"use client"
import { check_balance } from "@/pages/interactERC20";
import { json, uint256 } from "starknet";
import data from "@/pages/ERC20ETH.json"
import { useState, useMemo, useEffect } from "react";

import {
    useAccount,
    useContract,
    useContractWrite,
    useNetwork,    
    useWaitForTransaction,
  } from "@starknet-react/core";
const abi = data;
const addrETH = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

function MyComponent() {
    const { address } = useAccount();
    const { chain } = useNetwork();
    const { contract } = useContract({ abi, address: addrETH });

    useEffect(() => {
        if (address) {
            console.log("Address is available:", address);
            const balance = check_balance(address);
            // 其他需要在地址可用时执行的逻辑
            console.log(balance);
        }
    }, [address]); // 当 address 变化时触发

    if (!address) {
        return <div>No address found</div>;
    }

    return <div>Address: {address}</div>;
}

export default function SellButton() {
    return <MyComponent />;
}