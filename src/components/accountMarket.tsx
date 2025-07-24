"use client"
import { useState, useMemo, useEffect } from "react";
import { Clock, Shield, User, Plus, X, DollarSign, RefreshCw, AlertCircle } from "lucide-react";
import SendButton from "./tasksend";
import PayButton from "./taskpay";
import { useAccount } from "@starknet-react/core";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { 
    getActiveListings, 
    getSessionKeyInfo, 
    rentSessionKey, 
    handleContractError,
    formatWeiToEth,
    formatTimestamp,
    parsePermissions
} from "../utils/contractUtils";
import { blockchainEventService, MarketplaceListing } from "../services/blockchainEventService";
import { sessionKeyService, StoredSessionKey } from "../services/sessionKeyService";
import { cacheService } from "../services/cacheService";
import { batchContractCall } from "../services/batchService";
import { paginationService, createPaginationState, PaginationState } from "../services/paginationService";
import { getSampleMarketplaceData } from "../utils/testDataLoader";
import { transactionService } from "../services/transactionService";
import { Account } from "starknet";

interface SessionKeyListing {
    sessionKey: string;
    owner: string;
    price: string;
    isActive: boolean;
    createdAt: number;
    expiresAt: number;
    permissions: string[];
    description?: string;
    duration?: string;
    type: 'available' | 'owned' | 'rented';
}

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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [listings, setListings] = useState<SessionKeyListing[]>([]);
    const [useMockData, setUseMockData] = useState(true);
    const [paginationState, setPaginationState] = useState<PaginationState>(
        createPaginationState(1, 6) // Show 6 items per page
    );
    
    // Mock data fallback
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

    // Load listings from blockchain event service
    const loadListings = async () => {
        if (!account.account) return;
        
        setIsLoading(true);
        setError(null);
        
        try {
            // Check contract health first
            const contractHealth = await blockchainEventService.checkContractHealth();
            
            if (contractHealth.sessionKeyManager && contractHealth.sessionKeyMarketplace) {
                // Try to fetch from blockchain event service
                const marketplaceListings = await blockchainEventService.getActiveMarketplaceListings();
                
                if (marketplaceListings.length > 0) {
                    const convertedListings: SessionKeyListing[] = marketplaceListings.map(listing => ({
                        sessionKey: listing.sessionKeyId,
                        owner: listing.owner,
                        price: listing.price,
                        isActive: listing.isActive,
                        createdAt: listing.createdAt,
                        expiresAt: listing.expiresAt,
                        permissions: listing.permissions,
                        description: listing.description,
                        duration: `${Math.floor((listing.expiresAt - Date.now()) / (1000 * 3600))} hours remaining`,
                        type: listing.owner === account.address ? 'owned' : 'available'
                    }));
                    
                    setListings(convertedListings);
                    setUseMockData(false);
                    setDivContent(`Loaded ${convertedListings.length} session keys from blockchain`);
                } else {
                    // No listings found, but contracts are working
                    setListings([]);
                    setUseMockData(false);
                    setDivContent('No active session keys found on the marketplace');
                }
            } else {
                // Fallback to old contract method
                const activeListings = await getActiveListings(account.account as Account, 0, 20);
                
                if (activeListings.length > 0) {
                    const listingsWithDetails = await Promise.all(
                        activeListings.map(async (sessionKey: string) => {
                            try {
                                const info = await getSessionKeyInfo(account.account as Account, sessionKey);
                                const currentTime = Math.floor(Date.now() / 1000);
                                
                                return {
                                    sessionKey,
                                    owner: info.owner,
                                    price: formatWeiToEth(info.price.toString()),
                                    isActive: info.is_active && currentTime < info.expires_at,
                                    createdAt: info.created_at,
                                    expiresAt: info.expires_at,
                                    permissions: parsePermissions(info.permissions || []),
                                    description: `Session key with ${parsePermissions(info.permissions || []).join(', ')} permissions`,
                                    duration: `${Math.floor((info.expires_at - currentTime) / 3600)} hours remaining`,
                                    type: info.owner === account.address ? 'owned' : 'available'
                                } as SessionKeyListing;
                            } catch (err) {
                                console.error('Failed to get session key info:', err);
                                return null;
                            }
                        })
                    );
                    
                    const validListings = listingsWithDetails.filter(listing => listing !== null) as SessionKeyListing[];
                    setListings(validListings);
                    setUseMockData(false);
                    setDivContent(`Loaded ${validListings.length} session keys from contracts`);
                } else {
                    setListings([]);
                    setUseMockData(false);
                    setDivContent('No active session keys found');
                }
            }
        } catch (err) {
            console.error('Failed to load listings:', err);
            const errorMessage = handleContractError(err);
            setError(errorMessage);
            setUseMockData(true);
            setDivContent(`Using mock data: ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Load listings on component mount and account change
    useEffect(() => {
        if (account.account) {
            loadListings();
        }
    }, [account.account]);

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

    // Rent session key using blockchain event service
    const handleRentSessionKey = async (sessionKey: string) => {
        if (!account.account || !account.address) return;
        
        console.log('=== TRANSACTION HASH DEBUG ===');
        console.log('🚀 Starting session key rental process...');
        console.log('Session Key ID:', sessionKey);
        console.log('Account Address:', account.address);
        console.log('Account Object:', account.account);
        
        setIsLoading(true);
        try {
            // Find the listing to get session data
            const listing = listings.find(l => l.sessionKey === sessionKey);
            console.log('📋 Found listing:', listing);
            
            console.log('🔄 Attempting to rent via blockchainEventService...');
            // Use blockchain event service for renting
            const txHash = await blockchainEventService.rentSessionKey(sessionKey, account.account);
            
            console.log('✅ Transaction submitted successfully!');
            console.log('📝 Raw transaction hash:', txHash);
            console.log('📏 Hash length:', txHash.length);
            console.log('🔍 Hash format check:', /^0x[0-9a-fA-F]{64}$/.test(txHash));
            console.log('📊 Hash preview:', `${txHash.slice(0, 10)}...${txHash.slice(-8)}`);
            
            setDivContent(`Session key rental transaction submitted: ${txHash.slice(0, 10)}...`);
            
            // Add transaction to transaction service for monitoring
            console.log('💾 Adding transaction to transactionService...');
            const transactionData = {
                hash: txHash,
                type: 'session_rent' as const,
                description: `Rented session key: ${listing?.description || sessionKey}`,
                amount: listing?.price,
                from: account.address,
                to: listing?.owner,
                sessionKeyId: sessionKey
            };
            console.log('📦 Transaction data to be stored:', transactionData);
            
            transactionService.addTransaction(transactionData);
            console.log('✅ Transaction added to monitoring service');
            
            // Try to import the session key for local management
            try {
                if (listing) {
                    console.log('📥 Importing session key for local management...');
                    const exportData = JSON.stringify({
                        id: listing.sessionKey,
                        description: listing.description,
                        permissions: listing.permissions,
                        duration: Math.floor((listing.expiresAt - Date.now()) / (1000 * 3600)),
                        price: listing.price,
                        expiresAt: listing.expiresAt,
                        sessionData: {
                            key: listing.sessionKey,
                            policies: listing.permissions.map(p => ({ contractAddress: '*', selector: p.toLowerCase() }))
                        }
                    });
                    
                    await sessionKeyService.importSessionKey(exportData, account.address);
                    console.log('✅ Session key imported successfully');
                    setDivContent(`Session key rented and imported successfully!`);
                }
            } catch (importError) {
                console.warn('⚠️ Failed to import session key locally:', importError);
                // Continue with just the rental success message
            }
            
            // Refresh listings after successful transaction
            setTimeout(() => {
                console.log('🔄 Refreshing listings...');
                loadListings();
            }, 3000);
            
        } catch (err) {
            console.log('❌ Primary method failed, trying fallback...');
            console.error('Primary error:', err);
            
            // Fallback to old method if blockchain event service fails
            try {
                console.log('🔄 Attempting fallback via rentSessionKey...');
                const txHash = await rentSessionKey(account.account as Account, sessionKey);
                
                console.log('✅ Fallback transaction submitted!');
                console.log('📝 Fallback transaction hash:', txHash);
                console.log('📏 Fallback hash length:', txHash.length);
                console.log('🔍 Fallback hash format check:', /^0x[0-9a-fA-F]{64}$/.test(txHash));
                console.log('📊 Fallback hash preview:', `${txHash.slice(0, 10)}...${txHash.slice(-8)}`);
                
                setDivContent(`Session key rental transaction submitted: ${txHash.slice(0, 10)}...`);
                
                // Add transaction to transaction service for monitoring (fallback method)
                console.log('💾 Adding fallback transaction to transactionService...');
                const listing = listings.find(l => l.sessionKey === sessionKey);
                const fallbackTransactionData = {
                    hash: txHash,
                    type: 'session_rent' as const,
                    description: `Rented session key: ${listing?.description || sessionKey}`,
                    amount: listing?.price,
                    from: account.address,
                    to: listing?.owner,
                    sessionKeyId: sessionKey
                };
                console.log('📦 Fallback transaction data:', fallbackTransactionData);
                
                transactionService.addTransaction(fallbackTransactionData);
                console.log('✅ Fallback transaction added to monitoring service');
                
                setTimeout(() => {
                    console.log('🔄 Refreshing listings after fallback...');
                    loadListings();
                }, 3000);
                
            } catch (fallbackErr) {
                console.error('❌ Both methods failed!');
                console.error('Fallback error:', fallbackErr);
                const errorMessage = handleContractError(fallbackErr);
                setError(errorMessage);
                setDivContent(`Failed to rent session key: ${errorMessage}`);
            }
        } finally {
            setIsLoading(false);
            console.log('🏁 Transaction process completed');
            console.log('=== END TRANSACTION HASH DEBUG ===');
        }
    };

    // Enhanced session key validation
    const validateSessionKeyAccess = async (sessionKey: string): Promise<boolean> => {
        if (!account.address) return false;
        
        try {
            const storedKeys = await sessionKeyService.getStoredSessionKeys(account.address);
            const storedKey = storedKeys.find((k: StoredSessionKey) => k.id === sessionKey);
            
            if (storedKey) {
                return await sessionKeyService.validateSessionKey(storedKey);
            }
            
            return false;
        } catch (error) {
            console.error('Failed to validate session key access:', error);
            return false;
        }
    };

    // Get session key details for enhanced display
    const getSessionKeyDetails = async (sessionKey: string) => {
        if (!account.address) return null;
        
        try {
            const storedKeys = await sessionKeyService.getStoredSessionKeys(account.address);
            const storedKey = storedKeys.find((k: StoredSessionKey) => k.id === sessionKey);
            
            if (storedKey) {
                return await sessionKeyService.getSessionKeyDetails(storedKey);
            }
            
            return null;
        } catch (error) {
            console.error('Failed to get session key details:', error);
            return null;
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

    // Load test data when no wallet is connected
    const [testData, setTestData] = useState<any>(null);
    
    useEffect(() => {
        if (!account.address) {
            const sampleData = getSampleMarketplaceData();
            setTestData(sampleData);
        }
    }, [account.address]);

    if (!account.address) {
        return (
            <div className="space-y-6">
                {/* Demo Banner */}
                <div className="text-center py-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <Shield className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Session Key Marketplace Demo</h3>
                    <p className="text-gray-600 mb-4">
                        Explore the marketplace with sample data. Connect your wallet for full functionality.
                    </p>
                    <Badge variant="outline" className="bg-white">
                        Demo Mode - Sample Data
                    </Badge>
                </div>

                {/* Demo Stats */}
                {testData?.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-white rounded-lg border">
                            <div className="text-2xl font-bold text-blue-600">{testData.stats.activeListings}</div>
                            <div className="text-sm text-gray-600">Active Listings</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                            <div className="text-2xl font-bold text-green-600">{testData.stats.totalVolume} ETH</div>
                            <div className="text-sm text-gray-600">Total Volume</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                            <div className="text-2xl font-bold text-purple-600">{testData.stats.categories.length}</div>
                            <div className="text-sm text-gray-600">Categories</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                            <div className="text-2xl font-bold text-orange-600">{testData.stats.averagePrice} ETH</div>
                            <div className="text-sm text-gray-600">Avg Price</div>
                        </div>
                    </div>
                )}

                {/* Demo Session Keys */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">Available Session Keys</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {testData?.listings?.map((listing: any, index: number) => {
                            const typeInfo = getTaskTypeInfo('buy');
                            const IconComponent = typeInfo.icon;

                            return (
                                <Card key={listing.sessionKey} className="hover:shadow-lg transition-shadow border-2 border-dashed border-gray-200">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700">
                                                <IconComponent className="w-3 h-3" />
                                                Demo Listing
                                            </Badge>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-gray-900">
                                                    {listing.price} ETH
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {listing.duration}
                                                </div>
                                            </div>
                                        </div>
                                        <CardTitle className="text-base line-clamp-2">
                                            {listing.description}
                                        </CardTitle>
                                    </CardHeader>
                                    
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <User className="w-4 h-4" />
                                                <span>From: {listing.owner.slice(0, 8)}...</span>
                                            </div>
                                            
                                            {listing.permissions && (
                                                <div className="flex flex-wrap gap-1">
                                                    {listing.permissions.map((permission: string, permIndex: number) => (
                                                        <Badge key={permIndex} variant="outline" className="text-xs">
                                                            {permission}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}

                                            {listing.category && (
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="text-xs">
                                                        {listing.category}
                                                    </Badge>
                                                    {listing.isHot && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            🔥 Hot
                                                        </Badge>
                                                    )}
                                                    {listing.isFeatured && (
                                                        <Badge variant="default" className="text-xs">
                                                            ⭐ Featured
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <Button
                                            size="sm"
                                            disabled
                                            className="flex items-center gap-1 w-full opacity-50"
                                        >
                                            <DollarSign className="w-3 h-3" />
                                            Connect Wallet to Rent
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* Call to Action */}
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <h4 className="text-lg font-semibold mb-2">Ready to Get Started?</h4>
                    <p className="text-gray-600 mb-4">
                        Connect your Starknet wallet to create, rent, and manage session keys
                    </p>
                    <div className="flex justify-center gap-4">
                        <Button variant="outline" className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            Connect Wallet
                        </Button>
                        <Button className="flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Learn More
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold">Session Key Marketplace</h3>
                    <div className="text-sm text-gray-600">
                        {useMockData ? `${tasks.length} mock session keys` : `${listings.length} live session keys`}
                        {useMockData && (
                            <Badge variant="outline" className="ml-2 text-xs">
                                Mock Data
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadListings}
                        disabled={isLoading || !account.account}
                        className="flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        onClick={() => addTask("New session key for lending", 0.001)}
                        className="flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Create Session Key
                    </Button>
                </div>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800">{error}</p>
                </div>
            )}
            
            {divContent && !error && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800">{divContent}</p>
                </div>
            )}

            {isLoading && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
                    <p className="text-blue-800">Loading session keys from blockchain...</p>
                </div>
            )}

            {/* Session Keys Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Live blockchain data */}
                {!useMockData && listings.map(listing => {
                    const typeInfo = getTaskTypeInfo(listing.type === 'owned' ? 'ready' : 'buy');
                    const IconComponent = typeInfo.icon;

                    return (
                        <Card key={listing.sessionKey} className="hover:shadow-lg transition-shadow">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <Badge variant={typeInfo.variant} className="flex items-center gap-1">
                                        <IconComponent className="w-3 h-3" />
                                        {listing.type === 'owned' ? 'Your Session Key' : 'Available to Rent'}
                                    </Badge>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-gray-900">
                                            {listing.price} ETH
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {listing.duration}
                                        </div>
                                    </div>
                                </div>
                                <CardTitle className="text-base line-clamp-2">
                                    {listing.description}
                                </CardTitle>
                            </CardHeader>
                            
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <User className="w-4 h-4" />
                                        <span>From: {listing.owner === account.address ? "You" : listing.owner.slice(0, 8) + "..."}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 text-sm text-gray-600">
                                        <Clock className="w-4 h-4" />
                                        <span>Expires: {formatTimestamp(listing.expiresAt)}</span>
                                    </div>
                                    
                                    {listing.permissions && (
                                        <div className="flex flex-wrap gap-1">
                                            {listing.permissions.map((permission, index) => (
                                                <Badge key={index} variant="outline" className="text-xs">
                                                    {permission}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {listing.type === 'available' && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleRentSessionKey(listing.sessionKey)}
                                            disabled={isLoading}
                                            className="flex items-center gap-1 w-full"
                                        >
                                            <DollarSign className="w-3 h-3" />
                                            Rent Session Key
                                        </Button>
                                    )}
                                    {listing.type === 'owned' && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled
                                            className="flex items-center gap-1 w-full"
                                        >
                                            <Shield className="w-3 h-3" />
                                            Your Session Key
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Mock data fallback */}
                {useMockData && tasks.map(task => {
                    const typeInfo = getTaskTypeInfo(task.type);
                    const IconComponent = typeInfo.icon;

                    return (
                        <Card key={task.id} className="hover:shadow-lg transition-shadow opacity-75">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <Badge variant={typeInfo.variant} className="flex items-center gap-1">
                                        <IconComponent className="w-3 h-3" />
                                        {typeInfo.label} (Mock)
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

            {/* Empty State */}
            {!useMockData && listings.length === 0 && !isLoading && (
                <div className="text-center py-12">
                    <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Session Keys Available</h3>
                    <p className="text-gray-600 mb-6">
                        No active session keys found on the marketplace. Be the first to create one!
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

            {useMockData && tasks.length === 0 && (
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
