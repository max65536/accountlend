import { useAccount, useContractWrite, useProvider } from "@starknet-react/core"
import { use, useState, useMemo } from "react"
import { AccountInterface, ProviderInterface, Signer, ec, Account } from "starknet"
import { createSession } from "@argent/x-sessions"
import { Send, Loader2 } from "lucide-react"
import { Button } from "./ui/button"

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

interface SendProps {
    targetaddress: string
}

async function sendSubKey(targetaddress: string, accountintr: AccountInterface, provider: ProviderInterface) {
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

export default function SendButton({ targetaddress }: SendProps) {
    const [isLoading, setIsLoading] = useState(false);
    // const {account} = useAccount();
    // if (!account) return
    // const {provider} = useProvider();
    
    const sendTransaction = async () => {
        setIsLoading(true);
        try {
            // sendSubKey(targetaddress, account, provider); 
            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log("Session key sent to:", targetaddress);
        } catch (error) {
            console.error("Failed to send session key:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Button
            onClick={sendTransaction}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="sm"
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Sending...
                </>
            ) : (
                <>
                    <Send className="w-3 h-3 mr-1" />
                    Send & Get Paid
                </>
            )}
        </Button>
    )
}
