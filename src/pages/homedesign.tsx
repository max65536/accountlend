import Head from 'next/head';
import { useState } from 'react';
// import styles from '../styles/Home.module.css';
import WalletBar from '@/components/WalletBar';
import { StarknetConfig } from '@starknet-react/core';
import { StarknetProvider } from '@/components/starknet-provider';
import { Double } from 'mongodb';

function Home() {
  const [accountAddress, setAccountAddress] = useState('0x123...abc');
  // 假设的委托任务列表

  interface Task {
    id: number;
    description: string;
    type: string;
    price:number;
  }
  

  const [tasks, setTasks] = useState([
    { id: 1, description: "0x2eb3 is lending subaccount", price:0.0001, type:"buy", from:"0xalice"},
    { id: 2, description: "0x3e91 wants to rent my subaccount", price:0.0002, type:"sell" , from:"0xbob"},
    { id: 3, description: "I created a new subaccount to lend", price:0.0002, type:"ready" , from:"0xbob"},
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

  const acceptTask = (task:Task) => {
    // 这里实现接受任务的逻辑
    console.log('接受任务', task);
    switch (task.type) {
        case "sell":            
            return {}; 
        case "ready":
            setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
            console.log(tasks)
            return {};
        case "buy":
          return {};
        default:
          return{};
      }
  };

  const addTask = (subaccount: string, price:number) => {
    const newTask = {
      id: tasks.length + 1, // 简单的方式生成新的ID
      description: subaccount,
      price: price,
      type: "ready",
      from: "myself"
    };
    setTasks([...tasks, newTask]);
  };  
  const getButtonStyle = (type:string) => {
    switch (type) {
      case "sell":
        return { backgroundColor: "hsl(120, 30%, 70%)" }; 
      case "ready":
        return { backgroundColor: "hsl(0, 50%, 70%)" };        
      case "buy":
        return { backgroundColor: "hsl(39, 50%, 70%)" };
      default:
        return {};
    }
  };

  const getButtonText = (type:string) => {
    switch (type) {
      case "sell":
        return "Comfirm the deal and send my subkey"; 
      case "ready":
        return "cancel";
      case "buy":
        return "I want to rent it";
      default:
        return "";
    }
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
          
          <div className="button-group">
            <StarknetProvider>
                <WalletBar />
            </StarknetProvider>
            <button>Create Sub-Account</button>
          </div>


        <button onClick={() => addTask("I created a new subaccount to lend", 0.00001)}>Add New Task</button>        
        <div>
          {tasks.map(task => (
            <div key={task.id} className="list-item">
              <p>{task.description}  ({task.price}ETH)
                <button 
                    style={getButtonStyle(task.type)}
                    onClick={() => acceptTask(task)}>{getButtonText(task.type)}</button></p>
            </div>
          ))}
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
