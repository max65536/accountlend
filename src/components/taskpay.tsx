import { useAccount, useContractWrite } from "@starknet-react/core"
import { useState, useMemo, useCallback } from "react"


const addrETH = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
interface PayButtonProps {
    address: string;
    amount: bigint;
  }

// function DownloadFile(filename:string, content:string){
//     const downloadFile = () => {
//         // 创建 Blob 对象
//         const blob = new Blob([content], { type: 'text/plain' });
//         // 创建 Blob URL
//         const url = URL.createObjectURL(blob);
//         // 创建下载链接
//         const link = document.createElement('a');
//         link.href = url;
//         link.download = filename;
//         // 这个方法用于在文档中未显示的情况下“点击”链接
//         document.body.appendChild(link);
//         link.click();
//         // 清理并移除链接
//         document.body.removeChild(link);
//         URL.revokeObjectURL(url); // 释放内存中的 Blob URL
//       };
// }

export default function PayButton({address, amount}:PayButtonProps) {
    // const { address } = useAccount()
    console.log("entering paybutton")
    const [count, setCount] = useState(0)
   
    const calls = useMemo(() => {
      const tx = {
        contractAddress: addrETH,
        entrypoint: 'approve',
        calldata: [address, count, 0]
      }
      return Array(count).fill(tx)
    }, [address, count])
    console.log("before call")
    const { write } = useContractWrite({ calls })
    console.log("after call")
    // DownloadFile("encryptedByYourPubkey.txt", "049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7")  
    
    const writeTransaction = () => {
        console.log("write!!!!!")
        write(); // 直接调用 write，不传入任何参数
      };
    // DownloadFile("encryptedByYourPubkey.txt", "049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7")
    return (
      < >
          <button style={{backgroundColor:"hsl(39, 50%, 70%)"}} onClick={writeTransaction}>Pay and get subkey</button>
      </>
    )
  }