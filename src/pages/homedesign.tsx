import Head from 'next/head';
import { useState } from 'react';
// import styles from '../styles/Home.module.css';
import WalletBar from '@/components/WalletBar';
import { StarknetConfig } from '@starknet-react/core';
import { StarknetProvider } from '@/components/starknet-provider';

function Home() {
  const [accountAddress, setAccountAddress] = useState('0x123...abc');
  // 假设的委托任务列表
  const [tasks, setTasks] = useState([
    { id: 1, description: "Sell 0.1 ETH" },
    { id: 2, description: "Task 2" },
    // 更多任务...
  ]);

  const connectAccount = () => {
    // 这里实现连接账户的逻辑
    console.log('连接账户');
  };

  const createSubAccount = () => {
    // 这里实现创建子账户的逻辑
    console.log('创建子账户');
  };

  const acceptTask = (taskId: number) => {
    // 这里实现接受任务的逻辑
    console.log('接受任务', taskId);
  };

  return (
    <div>
    <Head>
      <title>Account Information and Delegation Management</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@1/css/pico.min.css" />
    </Head>

    <nav className="container-fluid">
      <ul>
        <li><strong>Account Management System</strong></li>
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
          <h2>Account Information</h2>
          <h3>Manage Your Account</h3>
          <p>Account Address: <span id="account-address">0x123...abc</span></p>
          <div className="button-group">
            <StarknetProvider>
                <WalletBar />
            </StarknetProvider>
            <button>Create Sub-Account</button>
          </div>


          <div>
            <main className="container">
                <h3>Delegation List</h3>
                <div>
                {tasks.map(task => (
                    <div key={task.id} className="list-item">
                    <p>{task.description} <button onClick={() => acceptTask(task.id)}>Accept</button></p>
                    </div>
                ))}
                </div>
            </main>
            {/* ... 其他内容 ... */}
            </div>
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
