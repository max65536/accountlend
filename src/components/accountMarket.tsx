"use client"
import { useState, useMemo, useEffect } from "react";
import { Clock, Shield, User, Plus, X, DollarSign } from "lucide-react";
import SendButton from "./tasksend";
import PayButton from "./taskpay";
import { useAccount } from "@starknet-react/core";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface Task {
    id: number;
    description: string;
    type: string;
    price: number;
    targetaddress: string;
    from: string;
    duration?: string;
    permissions?: string[];
}

const getTaskTypeInfo = (type: string) => {
    switch (type) {
        case "sell":
            return {
                variant: "success" as const,
                label: "Available to Sell",
                icon: DollarSign,
                color: "text-green-600"
            };
        case "ready":
            return {
                variant: "warning" as const,
                label: "Ready to Lend",
                icon: Clock,
                color: "text-yellow-600"
            };
        case "buy":
            return {
                variant: "default" as const,
                label: "Available to Rent",
                icon: Shield,
                color: "text-blue-600"
            };
        default:
            return {
                variant: "secondary" as const,
                label: "Unknown",
                icon: User,
                color: "text-gray-600"
            };
    }
};

export default function AccountMarket() {
    const account = useAccount();
    const [divContent, setDivContent] = useState('');
    const [tasks, setTasks] = useState<Task[]>([
        {
            id: 1,
            description: "Gaming account with DeFi permissions",
            price: 0.002,
            type: "buy",
            from: "0xalice",
            targetaddress: "0x01610Aba41F34F50ffc14DCd74c5e595eA23a22d9eeD6E37c503118Ee901f039",
            duration: "24 hours",
            permissions: ["Transfer", "Swap", "Gaming"]
        },
        {
            id: 2,
            description: "DeFi trading session key",
            price: 0.0005,
            type: "sell",
            from: "0xbob",
            targetaddress: "0x0339cA6cf886E7cc57C198b2FA5c5a833bf7C5F4276B8bD487Be1722A9ada124",
            duration: "12 hours",
            permissions: ["Swap", "Liquidity"]
        },
        {
            id: 3,
            description: "My new session key for lending",
            price: 0.001,
            type: "ready",
            from: "myself",
            targetaddress: "0x00",
            duration: "6 hours",
            permissions: ["Transfer", "Gaming"]
        },
    ]);

    const acceptTask = (task: Task) => {
        console.log('Processing task', task);
        switch (task.type) {
            case "sell":
                console.log("sell");
                if (!account.address) return {};
                setDivContent("Transaction successful!");
                return {};
            case "ready":
                setTasks(prevTasks => prevTasks.filter(t => t.id !== task.id));
                setDivContent("Session key cancelled successfully");
                return {};
            case "buy":
                console.log("Purchasing session key for address: " + account.address);
                return {};
            default:
                return {};
        }
    };

    const addTask = (description: string, price: number) => {
        const newTask: Task = {
            id: tasks.length + 1,
            description,
            price,
            type: "ready",
            from: "myself",
            targetaddress: "0x00",
            duration: "24 hours",
            permissions: ["Transfer", "Gaming"]
        };
        setTasks([...tasks, newTask]);
        setDivContent("New session key created successfully!");
    };

    if (!account.address) {
        return (
            <div className="text-center py-12">
                <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
                <p className="text-gray-600">
                    Please connect your Starknet wallet to access the marketplace
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold">Session Key Marketplace</h3>
                    <p className="text-sm text-gray-600">
                        {tasks.length} session keys available
                    </p>
                </div>
                <Button
                    onClick={() => addTask("New session key for lending", 0.001)}
                    className="flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create Session Key
                </Button>
            </div>

            {/* Status Message */}
            {divContent && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800">{divContent}</p>
                </div>
            )}

            {/* Task Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tasks.map(task => {
                    const typeInfo = getTaskTypeInfo(task.type);
                    const IconComponent = typeInfo.icon;

                    return (
                        <Card key={task.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <Badge variant={typeInfo.variant} className="flex items-center gap-1">
                                        <IconComponent className="w-3 h-3" />
                                        {typeInfo.label}
                                    </Badge>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-gray-900">
                                            {task.price} ETH
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {task.duration}
                                        </div>
                                    </div>
                                </div>
                                <CardTitle className="text-base line-clamp-2">
                                    {task.description}
                                </CardTitle>
                            </CardHeader>
                            
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <User className="w-4 h-4" />
                                        <span>From: {task.from === "myself" ? "You" : task.from.slice(0, 8) + "..."}</span>
                                    </div>
                                    
                                    {task.permissions && (
                                        <div className="flex flex-wrap gap-1">
                                            {task.permissions.map((permission, index) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                    {permission}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {task.type === 'sell' && (
                                        <SendButton targetaddress={task.targetaddress} />
                                    )}
                                    {task.type === 'buy' && (
                                        <PayButton
                                            address={task.targetaddress}
                                            amount={BigInt(Math.floor(task.price * 1e18))}
                                        />
                                    )}
                                    {task.type === 'ready' && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => acceptTask(task)}
                                            className="flex items-center gap-1 w-full"
                                        >
                                            <X className="w-3 h-3" />
                                            Cancel
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {tasks.length === 0 && (
                <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Session Keys Available</h3>
                    <p className="text-gray-600 mb-6">
                        Be the first to create a session key for lending
                    </p>
                    <Button
                        onClick={() => addTask("My first session key", 0.001)}
                        className="flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create First Session Key
                    </Button>
                </div>
            )}
        </div>
    );
}
