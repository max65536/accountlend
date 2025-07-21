"use client";
import { useAccount, useConnect, useContractWrite, useProvider } from "@starknet-react/core";
import { Button } from "./ui/button";
import { queryClass } from "./queryClass";
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
  const ozAccountClassHash = "0x04c6d6cf894f8bc96bb9c525e6853e5483177841f7388f74a46cfda6f028c755"
  const bravoosAccountClashHash = "0x3131fa018d520a037686ce3efddeab8f28895662f019ca3ca18a626650f7d1e"
  const provider = new Provider({ sequencer: { network: constants.NetworkName.SN_GOERLI } }) // for testnet

  // const testAddress = "0x5f7cd1fd465baff2ba9d2d1501ad0a2eb5337d9a885be319366b5205a414fdd";


  export default function UpgradeAccount() {
    const { account } = useAccount();
    const connection = useConnect();
    const provider = useProvider();
  
    async function upgradeAccount() {
      console.log("start");
      if (!account) {
        // 处理account不存在的情况
        console.error('账户未连接');
        return;
      }
  
      const argentAccountClassHash = argentAccountClassHash_rc2;
      // const argentAccountClassHash = ozAccountClassHash;
      const calldata: RawCalldata = [];
      const provider = new Provider({ sequencer: { network: constants.NetworkName.SN_GOERLI }});

      // console.log("account.address");
      // // const classhash = queryClass(account.address);
      // try {
      
      //   console.log(account.address);
      //   if (account.address) {
      //     const abi = await provider.getCode(account.address); // Async function call
      //     const classhash = await provider.getClassHashAt(account.address);
      //     console.log(abi);
      //     console.log("classhash = "+ classhash);
      //     // Process your ABI here
      //     return abi;
      //   }
      // } catch (error) {
      //   console.error('query error', error);
      // }

      
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
