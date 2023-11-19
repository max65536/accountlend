
import { Provider, constants } from "starknet";
import data from "@/pages/ERC20ETH.json"
import { json, Account, Contract, uint256, cairo, Uint256, Call } from "starknet";
// initialize provider
const provider = new Provider({ sequencer: { network: constants.NetworkName.SN_GOERLI } }) // for testnet
// initialize existing pre-deployed account 0 of Devnet

const privateKey = "0xe3e70682c2094cac629f6fbed82c07cd";
const accountAddress = "0x7e00d496e324876bbc8531f2d9a82bf154d1a04a50218ee74cdd372f75a551a";

const account0 = new Account(provider, accountAddress, privateKey);
const compiledErc20mintable = data


const addrETH = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
const erc20Address = addrETH
const erc20 = new Contract(compiledErc20mintable, addrETH, provider);
erc20.connect(account0);

// Check balance - should be 100
async function check_balance(address: string) {
    console.log(`Calling Starknet for account balance...`);
    const balanceInitial = await erc20.balanceOf(address);
    console.log("account0 has a balance of:", uint256.uint256ToBN(balanceInitial.balance).toString()); // Cairo 0 response    
    return uint256.uint256ToBN(balanceInitial.balance)
}

async function transfer(from:string, to:string, amount:number) {
    // Execute tx transfer of 10 tokens
    console.log(`Invoke Tx - Transfer 10 tokens back to erc20 contract...`);
    const toTransferTk: Uint256 = cairo.uint256(amount);
    const transferCallData: Call = erc20.populate("transfer", {
        recipient: erc20Address,
        amount: toTransferTk // with Cairo 1 contract, 'toTransferTk' can be replaced by '10n'
    });
        const { transaction_hash: transferTxHash } = await erc20.transfer( transferCallData.calldata);

    // Wait for the invoke transaction to be accepted on Starknet
    console.log(`Waiting for Tx to be Accepted on Starknet - Transfer...`);
    await provider.waitForTransaction(transferTxHash);
}

export {check_balance, transfer}
