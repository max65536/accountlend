import { useAccount, useContractWrite } from "@starknet-react/core"
import { useState, useMemo, useCallback, useEffect } from "react"
import { CreditCard, Download, Loader2 } from "lucide-react"
import { Button } from "./ui/button"

const addrETH = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";

interface PayButtonProps {
    address: string;
    amount: bigint;
}

export default function PayButton({ address, amount }: PayButtonProps) {
    const [count, setCount] = useState(0)
    const [isLoading, setIsLoading] = useState(false)
    const [isPaid, setIsPaid] = useState(false)
    
    console.log("amount = " + amount)
    
    const calls = useMemo(() => {
        const tx = {
            contractAddress: addrETH,
            entrypoint: 'transfer',
            calldata: [address, Number(amount), 0]
        }
        return Array(1).fill(tx)
    }, [address, count])

    const { write } = useContractWrite({ calls });

    const writeTransaction = async () => {
        setIsLoading(true);
        try {
            write(); // 调用写操作
            console.log("Payment initiated");
            
            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            setIsPaid(true);
            
            // 文件下载逻辑
            const filename = 'session-key-encrypted.txt';
            const content = JSON.stringify({
                sessionKey: '049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
                expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
                permissions: ['transfer', 'swap'],
                encrypted: true
            }, null, 2);

            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
        } catch (error) {
            console.error("Payment failed:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isPaid) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="w-full text-green-600 border-green-600"
                disabled
            >
                <Download className="w-3 h-3 mr-1" />
                Session Key Downloaded
            </Button>
        );
    }

    return (
        <Button
            onClick={writeTransaction}
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            size="sm"
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Processing...
                </>
            ) : (
                <>
                    <CreditCard className="w-3 h-3 mr-1" />
                    Pay & Rent
                </>
            )}
        </Button>
    )
}
