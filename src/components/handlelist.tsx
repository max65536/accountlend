"use client";
import { useState } from "react";
import { useAccount } from "@starknet-react/core";

export default function handleList(){    
    const address = useAccount();
    interface Task {
        id: number;
        description: string;
        type: string;
        price:number;
  }
  const [divContent, setDivContent] = useState('Initial Content');
  const [tasks, setTasks] = useState([
    { id: 1, description: "0x2eb3 is lending subaccount", price:0.0001, type:"buy", from:"0xalice"},
    { id: 2, description: "0x3e91 wants to rent my subaccount", price:0.0002, type:"sell" , from:"0xbob"},
    { id: 3, description: "I created a new subaccount to lend", price:0.0002, type:"ready" , from:"0xbob"},
    // 更多任务...
  ]);

const acceptTask = (task:Task) => {
    // 这里实现接受任务的逻辑
    console.log('接受任务', task);
    switch (task.type) {
        case "sell": 
            console.log("sell");
            setDivContent("sell succeed");
            return {};
        case "ready":
            setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
            console.log(tasks)
            return <div>"finished"</div>;
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

  

    return address? 
    <div>
    <button onClick={() => addTask("I created a new subaccount to lend", 0.00001)}>Add New Task</button>        
    <div>{divContent}</div>


    {tasks.map(task => (
        <div key={task.id} className="list-item">
        <p>{task.description}  ({task.price}ETH)        
            <button 
                style={getButtonStyle(task.type)}
                onClick={() => acceptTask(task)}>{getButtonText(task.type)}</button></p>                
        </div>
    ))}
    </div>
    : <div>Please connect contract</div>
;
}