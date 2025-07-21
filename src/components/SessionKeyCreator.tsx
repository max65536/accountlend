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
    price: '0.001',
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
      // TODO: Implement actual session key creation with @argent/x-sessions
      console.log('Creating session key with data:', {
        ...sessionData,
        owner: account.address,
        expires: Date.now() + (sessionData.duration * 3600 * 1000)
      });

      // Simulate session key creation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setSuccess(false);
        setSessionData({
          duration: 24,
          permissions: ['transfer'],
          price: '0.001',
          description: ''
        });
      }, 3000);
      
    } catch (err) {
      setError('Failed to create session key: ' + (err as Error).message);
      console.error(err);
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
        <Badge variant="secondary" className="mb-4">
          Duration: {sessionData.duration}h | Price: {sessionData.price} ETH
        </Badge>
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
            <label className="block text-sm font-medium mb-2">Price (ETH)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="number"
                step="0.0001"
                min="0"
                value={sessionData.price}
                onChange={(e) => setSessionData(prev => ({ ...prev, price: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.001"
              />
            </div>
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

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
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
                <div>Price: {sessionData.price} ETH</div>
                <div>Permissions: {sessionData.permissions.length} selected</div>
                <div>Owner: {address?.slice(0, 6)}...{address?.slice(-4)}</div>
              </div>
            </div>
            
            <Button
              onClick={handleCreateSessionKey}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
