"use client"
import { check_balance } from "@/pages/interactERC20";
import { json, uint256 } from "starknet";
import data from "@/pages/ERC20ETH.json"
import { useState, useMemo, useEffect } from "react";
import SendButton from "./tasksend";
import ShowAddress from "./transferButton";
import PayButton from "./taskpay";


import {
    useAccount,
    useContract,
    useContractWrite,
    useNetwork,    
    useWaitForTransaction,
  } from "@starknet-react/core";
// import AddComponent from "./increment";

interface Task {
    id: number;
    description: string;
    type: string;
    price:number;
    targetaddress:string;
    }

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
        return "get paid and send my subkey"; 
      case "ready":
        return "cancel";
      case "buy":
        return "pay and rent it";
      default:
        return "";
    }
  };  


export default function AccountMarket() {
    const account = useAccount();
    const [divContent, setDivContent] = useState('Initial Content');
    const [alllist, setAllList] = useState();
    const [tasks, setTasks] = useState([
    { id: 1, description: "0x1610 is lending subaccount", price:0.000000000002, type:"buy", from:"0xalice", targetaddress: "0x01610Aba41F34F50ffc14DCd74c5e595eA23a22d9eeD6E37c503118Ee901f039"},
    { id: 2, description: "0x0339 wants to rent as my subaccount", price:0.0002, type:"sell" , from:"0xbob", targetaddress: "0x0339cA6cf886E7cc57C198b2FA5c5a833bf7C5F4276B8bD487Be1722A9ada124"},
    { id: 3, description: "I created a new subaccount to lend", price:0.0002, type:"ready" , from:"0xbob", targetaddress:"0x00"},
    // 更多任务...
    ]);

    const acceptTask = (task:Task) => {
        // 这里实现接受任务的逻辑
        console.log('接受任务', task);
        switch (task.type) {
            case "sell": 
                console.log("sell");
                if (!account.address) return {};
                const result = check_balance(account.address);
                setDivContent("sell succeed");            
                return {};
            case "ready":
                setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
                console.log(tasks)
                return {};
            case "buy":
                console.log("address" + account.address);
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
          from: "myself",
          targetaddress:"0x00"
        };
        setTasks([...tasks, newTask]);
      };  
    return account ? 
    <div>
    <button onClick={() => addTask("I created a new subaccount to lend", 0.00001)}>Add New Subaccount</button>        
    <div>{divContent}</div>
    {/* <ShowAddress /> */}
    {/* <PayButton address="0xaa" amount={BigInt(10)}/> */}
    {/* <AddComponent/> */}
    {tasks.map(task => (
        <div key={task.id} className="list-item">
            <p>{task.description} ({task.price}ETH)
            {task.type === 'sell' && (
                <SendButton targetaddress={task.targetaddress}/>
            )}
            {task.type === 'buy' && (
                <PayButton 
                    address={task.targetaddress} amount={BigInt(task.price * 1e18)}/>
                    
            )}
            {task.type === 'ready' && (
                <button
                style={getButtonStyle(task.type)}
                onClick={() => acceptTask(task)}
                >
                Cancel
                </button>
            )}
            {/* 这里可以继续添加更多基于 task.type 的条件渲染 */}
            </p>              
        </div>
    ))}
    </div>
    : <div>Please connect contract</div>
;
}