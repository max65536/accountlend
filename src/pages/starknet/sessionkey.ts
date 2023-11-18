import { Signer, ec } from "starknet"

// gets signer with random private key you need to store if you want to reuse the session

async function createKey() {
  const sessionSigner = new Signer()

  const requestSession = {
    key: await sessionSigner.getPubKey(),
    expires: Math.floor((Date.now() + 1000 * 60 * 60 * 24) / 1000), // 1 day in seconds
    policies: [
      {
        contractAddress: "0x...",
        selector: "doAction"
      }
    ]
  }  
}
