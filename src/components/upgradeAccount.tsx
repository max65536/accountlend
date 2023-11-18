"use client";
import { useAccount, useConnect, useContractWrite } from "@starknet-react/core";
import { Button } from "./ui/Button";
import React from 'react'
import {
    Account,
    CallData,
    Contract,
    InvokeTransactionReceiptResponse,
    RawCalldata,
    Provider,    
    constants,
  } from "starknet";
  const argentAccountClassHash = "0x1a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003";
  const argentAccountClassHash_rc2 = "0x45bb3b296122454fb31d45c48da6143df12bcf58311dcd75193df42d79f8dd2";
  const provider = new Provider({ sequencer: { network: constants.NetworkName.SN_GOERLI } }) // for testnet



  export default function UpgradeAccount() {
    const { account } = useAccount();
    const connection = useConnect()
  
    async function upgradeAccount() {
      if (!account) {
        // 处理account不存在的情况
        console.error('账户未连接');
        return;
      }
  
      const argentAccountClassHash = argentAccountClassHash_rc2;
      const calldata: RawCalldata = [];
      
      try {
        const { transaction_hash: transferTxHash } = await account.execute({
          contractAddress: account.address,
          entrypoint: "upgrade",
          calldata: CallData.compile({ implementation: argentAccountClassHash, calldata }),
        });
  
        const result = await provider.waitForTransaction(transferTxHash);
        console.log("success");
        // 你可能需要将结果传递给状态或其他处理函数，而不是返回JSX
      } catch (error) {
        // 处理错误
        console.error('升级账户时出错', error);
      }
    }
  
    // 在JSX中使用按钮或其他元素来触发upgradeAccount
    return (
      <div>
        <button onClick={upgradeAccount}>升级账户</button>
      </div>
    );
  }
  
