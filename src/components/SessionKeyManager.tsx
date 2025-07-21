"use client"
import React, { useState, useEffect } from 'react';
import { useAccount } from '@starknet-react/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Shield, 
  Clock, 
  Key, 
  Trash2, 
  Eye, 
  EyeOff, 
  Copy, 
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface SessionKey {
  id: string;
  description: string;
  permissions: string[];
  duration: number;
  price: string;
  createdAt: number;
  expiresAt: number;
  status: 'active' | 'expired' | 'revoked' | 'rented';
  rentedBy?: string;
  earnings?: number;
}

const mockSessionKeys: SessionKey[] = [
  {
    id: '0x1a2b3c4d5e6f',
    description: 'Gaming account with DeFi permissions',
    permissions: ['transfer', 'swap', 'gaming'],
    duration: 24,
    price: '0.002',
    createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
    expiresAt: Date.now() + 22 * 60 * 60 * 1000, // 22 hours from now
    status: 'rented',
    rentedBy: '0xabc123...def456',
    earnings: 0.002
  },
  {
    id: '0x2b3c4d5e6f7a',
    description: 'DeFi trading session key',
    permissions: ['swap', 'approve'],
    duration: 12,
    price: '0.001',
    createdAt: Date.now() - 6 * 60 * 60 * 1000, // 6 hours ago
    expiresAt: Date.now() + 6 * 60 * 60 * 1000, // 6 hours from now
    status: 'active'
  },
  {
    id: '0x3c4d5e6f7a8b',
    description: 'NFT trading permissions',
    permissions: ['nft', 'approve'],
    duration: 48,
    price: '0.005',
    createdAt: Date.now() - 50 * 60 * 60 * 1000, // 50 hours ago
    expiresAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago (expired)
    status: 'expired'
  }
];

const getStatusInfo = (status: SessionKey['status']) => {
  switch (status) {
    case 'active':
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: CheckCircle,
        label: 'Available'
      };
    case 'rented':
      return {
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: Key,
        label: 'Rented'
      };
    case 'expired':
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: Clock,
        label: 'Expired'
      };
    case 'revoked':
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: XCircle,
        label: 'Revoked'
      };
    default:
      return {
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        icon: Shield,
        label: 'Unknown'
      };
  }
};

const formatTimeRemaining = (expiresAt: number) => {
  const now = Date.now();
  const diff = expiresAt - now;
  
  if (diff <= 0) return 'Expired';
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  } else {
    return `${minutes}m remaining`;
  }
};

export default function SessionKeyManager() {
  const { account, address } = useAccount();
  const [sessionKeys, setSessionKeys] = useState<SessionKey[]>(mockSessionKeys);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  const totalEarnings = sessionKeys.reduce((sum, key) => sum + (key.earnings || 0), 0);
  const activeKeys = sessionKeys.filter(key => key.status === 'active').length;
  const rentedKeys = sessionKeys.filter(key => key.status === 'rented').length;

  const handleRevokeKey = async (keyId: string) => {
    setLoading(prev => ({ ...prev, [keyId]: true }));
    
    try {
      // TODO: Implement actual revocation logic
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setSessionKeys(prev => 
        prev.map(key => 
          key.id === keyId 
            ? { ...key, status: 'revoked' as const }
            : key
        )
      );
    } catch (error) {
      console.error('Failed to revoke session key:', error);
    } finally {
      setLoading(prev => ({ ...prev, [keyId]: false }));
    }
  };

  const handleCopyKey = (keyId: string) => {
    navigator.clipboard.writeText(keyId);
    // You could add a toast notification here
  };

  const handleDownloadKey = (sessionKey: SessionKey) => {
    const keyData = {
      id: sessionKey.id,
      description: sessionKey.description,
      permissions: sessionKey.permissions,
      expiresAt: sessionKey.expiresAt,
      owner: address
    };
    
    const blob = new Blob([JSON.stringify(keyData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-key-${sessionKey.id.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!account) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">
          Please connect your Starknet wallet to manage your session keys
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Keys</p>
                <p className="text-2xl font-bold">{sessionKeys.length}</p>
              </div>
              <Key className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{activeKeys}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rented</p>
                <p className="text-2xl font-bold text-blue-600">{rentedKeys}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Earnings</p>
                <p className="text-2xl font-bold text-purple-600">{totalEarnings.toFixed(4)} ETH</p>
              </div>
              <Download className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Session Keys List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Session Keys</h3>
        
        {sessionKeys.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Key className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Session Keys</h3>
              <p className="text-gray-600 mb-6">
                You haven't created any session keys yet
              </p>
              <Button>Create Your First Session Key</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {sessionKeys.map((sessionKey) => {
              const statusInfo = getStatusInfo(sessionKey.status);
              const StatusIcon = statusInfo.icon;
              const isExpiringSoon = sessionKey.expiresAt - Date.now() < 2 * 60 * 60 * 1000; // 2 hours
              
              return (
                <Card key={sessionKey.id} className={`${statusInfo.borderColor} border-2`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant="secondary" 
                            className={`${statusInfo.bgColor} ${statusInfo.color} border-0`}
                          >
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                          {isExpiringSoon && sessionKey.status === 'active' && (
                            <Badge variant="destructive" className="text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Expiring Soon
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-base">{sessionKey.description}</CardTitle>
                        <CardDescription className="mt-1">
                          ID: {sessionKey.id}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">{sessionKey.price} ETH</div>
                        {sessionKey.earnings && (
                          <div className="text-sm text-green-600">
                            Earned: {sessionKey.earnings} ETH
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <span className="ml-2 font-medium">{sessionKey.duration}h</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <span className={`ml-2 font-medium ${statusInfo.color}`}>
                          {formatTimeRemaining(sessionKey.expiresAt)}
                        </span>
                      </div>
                    </div>
                    
                    {sessionKey.rentedBy && (
                      <div className="text-sm">
                        <span className="text-gray-600">Rented by:</span>
                        <span className="ml-2 font-mono">{sessionKey.rentedBy}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {sessionKey.permissions.map((permission, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyKey(sessionKey.id)}
                        className="flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy ID
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadKey(sessionKey)}
                        className="flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        Export
                      </Button>
                      
                      {(sessionKey.status === 'active' || sessionKey.status === 'rented') && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRevokeKey(sessionKey.id)}
                          disabled={loading[sessionKey.id]}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          {loading[sessionKey.id] ? 'Revoking...' : 'Revoke'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
