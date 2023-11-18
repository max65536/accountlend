import { useAccount, useBalance, useConnect } from "@starknet-react/core";
import { Provider, constants } from "starknet";
const testAddress = "0x5f7cd1fd465baff2ba9d2d1501ad0a2eb5337d9a885be319366b5205a414fdd";


export function queryClass(accountaddress:string) {
    // const { account } = useAccount(); // Hook at the top level
  
    const queryContract = async () => {
      try {
        const provider = new Provider({ sequencer: { network: constants.NetworkName.SN_GOERLI }});
        console.log(accountaddress);
        if (accountaddress) {
          const abi = await provider.getCode(accountaddress); // Async function call
          console.log(abi);
          // Process your ABI here
          return abi;
        }
      } catch (error) {
        console.error('query error', error);
      }
    };

    return queryContract();

}