import { useAccount, useContractWrite, useProvider } from "@starknet-react/core"
import { use, useState, useMemo } from "react"
import { AccountInterface, ProviderInterface, Signer, ec, Account } from "starknet"
import { createSession } from "@argent/x-sessions"



// gets signer with random private key you need to store if you want to reuse the session
const sessionSigner = new Signer()

interface Policy {
    contractAddress: string
    selector: string
  }
  
  interface RequestSession {
    key: string
    expires: number
    policies: Policy[]
  }

  interface Send {
    targetaddress:string
  }

async function sendSubKey(targetaddress: string, accountintr:AccountInterface, provider:ProviderInterface) {
    const requestSession: RequestSession = {
        key: targetaddress,
        expires: Math.floor((Date.now() + 1000 * 60 * 60 * 24) / 1000), // 1 day in seconds
        policies: [
            {
            contractAddress: "0x...",
            selector: "doAction"
            }
        ]
    }
    // calls account.signMessage internally
    
    const account = new Account(provider, accountintr.address, accountintr.signer);    
    // const ac = new AccountInterface(account);
    // const signedSession = await createSession(requestSession, accountintr)


}


export default function sendComponent({targetaddress}:Send){
    const {account} = useAccount();
    if (!account) return
    const {provider} = useProvider();
    const sendTransaction = () => {
        sendSubKey(targetaddress, account, provider); 
      };
    
    return (
        < >
            <button style={{background: "hsl(120, 30%, 70%)" }} onClick={sendTransaction}>Set the address as my subkey and get paid</button>
        </>
      )    
}

