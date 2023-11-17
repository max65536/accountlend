"use client";
import { useAccount, useConnect, useDisconnect, useWaitForTransaction } from "@starknet-react/core";
import { Button } from "./ui/Button";
import React from 'react'

const argentAccountClassHash = "0x1a736d6ed154502257f02b1ccdf4d9d1089f80811cd6acad48e6b6a9d1f2003";
const argentAccountClassHash_rc2 = "0x45bb3b296122454fb31d45c48da6143df12bcf58311dcd75193df42d79f8dd2";

async function handleTransaction() {
  // StarkNet钱包连接
  const { account } = useAccount()
  // StarkNet交易调用
//   const { invoke } = useStarknetInvoke({ contractAddress: 'YOUR_CONTRACT_ADDRESS', method: 'YOUR_CONTRACT_METHOD' })

    // const { sendTransaction } = useStarknetTransaction()

    const handleSendETH = async () => {
    if (!account) {
        console.log('请先连接钱包')
        return
    }

    // 这里你需要替换为实际的合约调用和参数
    const { error, transactionHash } = await sendTransaction({
        to: '0xaaab',
        value: '1000000000000000000' // 发送1个ETH单位的代币数量
    })

    if (error) {
        console.error('交易发起错误:', error)
    } else {
        console.log('交易发起成功，交易哈希:', transactionHash)
    }
    }

  
}

export default function sendTransaction() {
    return (
        <div>
          <button onClick={handleTransaction}>发起交易</button>
        </div>
      )
  }
  