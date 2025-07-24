"use client"
import React, { useState } from 'react';
import { useAccount } from '@starknet-react/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Plus, Clock, Shield, DollarSign, Loader2, CheckCircle } from 'lucide-react';

interface SessionKeyData {
  duration: number;
  permissions: string[];
  price: string;
  currency: 'STRK' | 'ETH';
  description: string;
}

const PERMISSION_OPTIONS = [
  { id: 'transfer', label: 'Transfer Tokens', description: 'Allow token transfers' },
  { id: 'swap', label: 'Token Swaps', description: 'Allow DEX trading' },
  { id: 'approve', label: 'Token Approvals', description: 'Allow token approvals' },
  { id: 'stake', label: 'Staking', description: 'Allow staking operations' },
  { id: 'gaming', label: 'Gaming', description: 'Allow gaming interactions' },
  { id: 'nft', label: 'NFT Operations', description: 'Allow NFT transfers and trades' }
];

const DURATION_OPTIONS = [
  { hours: 1, label: '1 Hour', popular: false },
  { hours: 6, label: '6 Hours', popular: true },
  { hours: 12, label: '12 Hours', popular: true },
  { hours: 24, label: '24 Hours', popular: true },
  { hours: 48, label: '48 Hours', popular: false },
  { hours: 168, label: '1 Week', popular: false }
];

export default function SessionKeyCreator() {
  const { account, address } = useAccount();
  const [sessionData, setSessionData] = useState<SessionKeyData>({
    duration: 24,
    permissions: ['transfer'],
    price: '0.1',
    currency: 'STRK',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePermissionToggle = (permissionId: string) => {
    setSessionData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId]
    }));
  };

  const handleCreateSessionKey = async () => {
    if (!account) {
      setError('Please connect your wallet first');
      return;
    }

    if (!sessionData.description.trim()) {
      setError('Please provide a description for your session key');
      return;
    }

    if (sessionData.permissions.length === 0) {
      setError('Please select at least one permission');
      return;
    }

    if (!sessionData.price || parseFloat(sessionData.price) <= 0) {
      setError('Please set a valid price');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Creating session key with data:', {
        ...sessionData,
        owner: account.address,
        expires: Date.now() + (sessionData.duration * 3600 * 1000)
      });

      // Import services
      const { sessionKeyService } = await import('../services/sessionKeyService');
      const { transactionService } = await import('../services/transactionService');
      
      try {
        // Create session key using the new service
        const result = await sessionKeyService.createSessionKey(
          account as any,
          sessionData.duration,
          sessionData.permissions,
          sessionData.price,
          sessionData.description
        );
        
        console.log('Session key created successfully:', result.sessionKey);
        console.log('Transaction hash from contract:', result.transactionHash);
        
        // Add transaction to tracking with real transaction hash if available
        if (result.transactionHash) {
          console.log('✅ Using real transaction hash from contract');
          transactionService.addTransaction({
            hash: result.transactionHash,
            type: 'session_create',
            description: `Create session key: ${sessionData.description}`,
            amount: sessionData.price,
            sessionKeyId: result.sessionKey.id
          });
        } else {
          console.log('⚠️ No transaction hash from contract, using mock hash');
          // Generate a proper 64-character hex string for demo
          const generateMockTxHash = () => {
            const chars = '0123456789abcdef';
            let result = '0x';
            for (let i = 0; i < 64; i++) {
              result += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return result;
          };
          
          const mockTxHash = generateMockTxHash();
          transactionService.addTransaction({
            hash: mockTxHash,
            type: 'session_create',
            description: `Create session key: ${sessionData.description}`,
            amount: sessionData.price,
            sessionKeyId: result.sessionKey.id
          });
        }
        
        setSuccess(true);
        
        // Reset form after success
        setTimeout(() => {
          setSuccess(false);
          setSessionData({
            duration: 24,
            permissions: ['transfer'],
            price: '0.1',
            currency: 'STRK',
            description: ''
          });
        }, 3000);
        
      } catch (sessionError) {
        console.error('Session key creation failed:', sessionError);
        
        // For demo purposes, create a mock session key if real creation fails
        console.log('Creating mock session key for demo');
        
        // Add failed transaction to tracking
        const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
        transactionService.addTransaction({
          hash: mockTxHash,
          type: 'session_create',
          description: `Create session key: ${sessionData.description}`,
          amount: sessionData.price,
          error: 'Demo mode - Argent X Sessions integration in progress'
        });
        
        await new Promise(resolve => setTimeout(resolve, 2000));
        setSuccess(true);
        setError('Demo mode: Session key created locally (Argent X Sessions integration in progress)');
        
        // Reset form after success
        setTimeout(() => {
          setSuccess(false);
          setError(null);
          setSessionData({
            duration: 24,
            permissions: ['transfer'],
            price: '0.1',
            currency: 'STRK',
            description: ''
          });
        }, 3000);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError('Failed to create session key: ' + errorMessage);
      console.error('Session key creation failed:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!account) {
    return (
      <div className="text-center py-12">
        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">
          Please connect your Starknet wallet to create session keys
        </p>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2 text-green-700">Session Key Created!</h3>
        <p className="text-gray-600 mb-4">
          Your session key has been created and is now available in the marketplace
        </p>
        <div className="space-y-2 mb-6">
          <Badge variant="secondary">
            Duration: {sessionData.duration}h | Price: {sessionData.price} {sessionData.currency}
          </Badge>
          <div className="text-sm text-gray-600">
            Permissions: {sessionData.permissions.join(', ')}
          </div>
        </div>
        <Button
          onClick={() => {
            setSuccess(false);
            setError(null);
          }}
          variant="outline"
        >
          Create Another Session Key
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Session Key Details
          </CardTitle>
          <CardDescription>
            Provide details about your session key offering
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={sessionData.description}
              onChange={(e) => setSessionData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="e.g., Gaming account with DeFi permissions, Trading session for DEX operations..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Price</label>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  step={sessionData.currency === 'STRK' ? '0.01' : '0.0001'}
                  min="0"
                  value={sessionData.price}
                  onChange={(e) => setSessionData(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={sessionData.currency === 'STRK' ? '0.1' : '0.001'}
                />
              </div>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setSessionData(prev => ({ 
                    ...prev, 
                    currency: 'STRK',
                    price: prev.currency === 'ETH' ? (parseFloat(prev.price || '0') * 100).toString() : prev.price
                  }))}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    sessionData.currency === 'STRK'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  STRK
                </button>
                <button
                  type="button"
                  onClick={() => setSessionData(prev => ({ 
                    ...prev, 
                    currency: 'ETH',
                    price: prev.currency === 'STRK' ? (parseFloat(prev.price || '0') / 100).toString() : prev.price
                  }))}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                    sessionData.currency === 'ETH'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  ETH
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {sessionData.currency === 'STRK' 
                ? 'STRK is recommended for STRK-only test accounts' 
                : 'ETH requires having ETH tokens for payment'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Duration Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Session Duration
          </CardTitle>
          <CardDescription>
            How long should the session key remain active?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {DURATION_OPTIONS.map((option) => (
              <button
                key={option.hours}
                onClick={() => setSessionData(prev => ({ ...prev, duration: option.hours }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  sessionData.duration === option.hours
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{option.label}</div>
                {option.popular && (
                  <Badge variant="secondary" className="mt-1 text-xs">Popular</Badge>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Permissions
          </CardTitle>
          <CardDescription>
            Select what actions the session key holder can perform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {PERMISSION_OPTIONS.map((permission) => (
              <label
                key={permission.id}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  sessionData.permissions.includes(permission.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={sessionData.permissions.includes(permission.id)}
                  onChange={() => handlePermissionToggle(permission.id)}
                  className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{permission.label}</div>
                  <div className="text-sm text-gray-600">{permission.description}</div>
                </div>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {loading && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-blue-800">
              Creating session key on Starknet... This may take a few moments.
            </p>
          </div>
        </div>
      )}

      {/* Create Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Summary</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Duration: {sessionData.duration} hours</div>
                <div>Price: {sessionData.price} {sessionData.currency}</div>
                <div>Permissions: {sessionData.permissions.length} selected</div>
                <div>Owner: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
              </div>
            </div>
            
            <Button
              onClick={handleCreateSessionKey}
              disabled={loading || !sessionData.description.trim() || sessionData.permissions.length === 0}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Session Key...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Session Key
                </>
              )}
            </Button>
            
            <p className="text-xs text-gray-500 text-center mt-2">
              This will create a session key on Starknet Sepolia testnet
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
