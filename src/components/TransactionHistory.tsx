"use client"
import React, { useState, useEffect } from 'react';
import { useAccount } from '@starknet-react/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  History, 
  ExternalLink, 
  Filter, 
  Download,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Key,
  ShoppingCart,
  Trash2,
  DollarSign
} from 'lucide-react';
import { transactionService, TransactionInfo } from '../services/transactionService';

const getTransactionIcon = (type: TransactionInfo['type']) => {
  switch (type) {
    case 'session_create':
      return Key;
    case 'session_rent':
      return ShoppingCart;
    case 'session_revoke':
      return Trash2;
    case 'marketplace_list':
      return DollarSign;
    case 'earnings_withdraw':
      return Download;
    default:
      return History;
  }
};

const getTransactionTypeLabel = (type: TransactionInfo['type']) => {
  switch (type) {
    case 'session_create':
      return 'Session Created';
    case 'session_rent':
      return 'Session Rented';
    case 'session_revoke':
      return 'Session Revoked';
    case 'marketplace_list':
      return 'Listed on Market';
    case 'earnings_withdraw':
      return 'Earnings Withdrawn';
    default:
      return 'Transaction';
  }
};

const getStatusInfo = (status: TransactionInfo['status']) => {
  switch (status) {
    case 'confirmed':
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: CheckCircle,
        label: 'Confirmed'
      };
    case 'pending':
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        icon: Clock,
        label: 'Pending'
      };
    case 'failed':
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: XCircle,
        label: 'Failed'
      };
    case 'rejected':
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: AlertTriangle,
        label: 'Rejected'
      };
    default:
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: Clock,
        label: 'Unknown'
      };
  }
};

const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

const getExplorerUrl = (hash: string): string => {
  return `https://sepolia.starkscan.co/tx/${hash}`;
};

interface TransactionHistoryProps {
  className?: string;
}

export default function TransactionHistory({ className = '' }: TransactionHistoryProps) {
  const { account, address } = useAccount();
  const [transactions, setTransactions] = useState<TransactionInfo[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransactionInfo[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | TransactionInfo['type'] | TransactionInfo['status']>('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    failed: 0,
    recentActivity: [] as TransactionInfo[]
  });

  useEffect(() => {
    // Subscribe to transaction updates
    const unsubscribe = transactionService.subscribe((newTransactions) => {
      setTransactions(newTransactions);
      setStats(transactionService.getTransactionStats());
    });

    // Load initial transactions
    setTransactions(transactionService.getTransactions());
    setStats(transactionService.getTransactionStats());

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Filter transactions based on selected filter
    if (selectedFilter === 'all') {
      setFilteredTransactions(transactions);
    } else {
      setFilteredTransactions(transactions.filter(tx => 
        tx.type === selectedFilter || tx.status === selectedFilter
      ));
    }
  }, [transactions, selectedFilter]);

  const handleExportTransactions = () => {
    const data = {
      exported_at: new Date().toISOString(),
      account: address,
      transactions: filteredTransactions
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accountlend-transactions-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!account) {
    return (
      <div className="text-center py-12">
        <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">
          Please connect your Starknet wallet to view transaction history
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <History className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Transaction History
              </CardTitle>
              <CardDescription>
                View and manage your transaction history
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportTransactions}
                className="flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Button
              variant={selectedFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('all')}
            >
              All ({transactions.length})
            </Button>
            <Button
              variant={selectedFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('pending')}
            >
              Pending ({stats.pending})
            </Button>
            <Button
              variant={selectedFilter === 'confirmed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('confirmed')}
            >
              Confirmed ({stats.confirmed})
            </Button>
            <Button
              variant={selectedFilter === 'session_create' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('session_create')}
            >
              Session Created
            </Button>
            <Button
              variant={selectedFilter === 'session_rent' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter('session_rent')}
            >
              Session Rented
            </Button>
          </div>

          {/* Transaction List */}
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <History className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Transactions</h3>
              <p className="text-gray-600">
                {selectedFilter === 'all' 
                  ? "You haven't made any transactions yet"
                  : `No ${selectedFilter} transactions found`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => {
                const TypeIcon = getTransactionIcon(transaction.type);
                const statusInfo = getStatusInfo(transaction.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <Card key={transaction.hash} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                            <TypeIcon className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900">
                                  {getTransactionTypeLabel(transaction.type)}
                                </h4>
                                <Badge 
                                  variant="secondary" 
                                  className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}
                                >
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {statusInfo.label}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-gray-600 mb-2">
                                {transaction.description}
                              </p>
                              
                              <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                                <div>
                                  <span className="font-medium">Hash:</span>
                                  <span className="ml-1 font-mono">
                                    {transaction.hash.slice(0, 10)}...{transaction.hash.slice(-8)}
                                  </span>
                                </div>
                                <div>
                                  <span className="font-medium">Time:</span>
                                  <span className="ml-1">
                                    {formatTimeAgo(transaction.timestamp)}
                                  </span>
                                </div>
                                {transaction.amount && (
                                  <div>
                                    <span className="font-medium">Amount:</span>
                                    <span className="ml-1">{transaction.amount} ETH</span>
                                  </div>
                                )}
                                {transaction.sessionKeyId && (
                                  <div>
                                    <span className="font-medium">Session:</span>
                                    <span className="ml-1 font-mono">
                                      {transaction.sessionKeyId.slice(0, 8)}...
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              {transaction.error && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                                  <span className="font-medium">Error:</span> {transaction.error}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(getExplorerUrl(transaction.hash), '_blank')}
                                className="text-xs"
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Explorer
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
