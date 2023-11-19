import Head from 'next/head';
import { useState } from 'react';
// import styles from '../styles/Home.module.css';
import WalletBar from '@/components/WalletBar';
import { StarknetConfig, useAccount } from '@starknet-react/core';
import { StarknetProvider } from '@/components/starknet-provider';
import { Double } from 'mongodb';
import { check_balance } from './interactERC20';
import SellButton from '@/components/sellbutton';
import handleList from '@/components/handlelist';
import AccountMarket from '@/components/accountMarket';
function Home() {
  const [accountAddress, setAccountAddress] = useState('0x123...abc');

  // 假设的委托任务列表


  const connectAccount = () => {
    // 这里实现连接账户的逻辑
    console.log('连接账户');
  };

  const createSubAccount = () => {
    // 这里实现创建子账户的逻辑
    console.log('创建子账户');
  };



  return (
    <div>
    <Head>
      <title>Account Lend and Rent</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css" />
    </Head>

    <nav className="container-fluid">
      <ul>
        <li><strong>Account Lend and Rent</strong></li>
      </ul>
      <ul>
        <li><a href="#">Home</a></li>
        <li><a href="#">Help</a></li>
        <li><a href="#" role="button">Logout</a></li>
      </ul>
    </nav>

    <main className="container">
      <div className="grid">
        <section>
        <StarknetProvider>
          <h2>Account Information</h2>
          <h3>Manage Your Account</h3>
          
          <div className="button-group">

                <WalletBar />                

            <button>Create Sub-Account</button>
          </div>
          <AccountMarket/>
          </StarknetProvider>
        </section>
      </div>
    </main>

    <footer className="container">
      <small><a href="#">Privacy Policy</a> • <a href="#">Terms & Conditions</a></small>
    </footer>
  </div>
);
}


export default Home;

const styles = {
  buttonGroup: {
    marginBottom: '20px',
    textAlign: 'center' as const,
  },
  listItem: {
    borderBottom: '1px solid #ddd',
    paddingBottom: '10px',
    paddingTop: '10px',
  },
};
