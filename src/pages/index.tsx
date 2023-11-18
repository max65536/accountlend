import WalletBar from "@/components/WalletBar";
import Balance from "@/components/queryBalance";
import UpgradeAccount from "@/components/upgradeAccount";
import { StarknetProvider } from "@/components/starknet-provider";

// const HomePage = () => {
//   return (
//     <div>
//       <h1>Welcome to the Next.js App</h1>
//       <p>This is a simple homepage.</p>
//     </div>
//   );
// };

// export default HomePage;

const HomePage = () => {
  return (
    <div>
    <StarknetProvider>
      <WalletBar />
      <Balance />
    </StarknetProvider>

      <h1>Welcome to the Next.js App</h1>
      <p>This is a simple homepage.</p>
    </div>
  );
}

export default HomePage;