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
  XCircle,
  Filter,
  Search,
  BarChart3,
  Settings,
  FileText,
  TrendingUp,
  Calendar,
  DollarSign,
  Users,
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react';
import { sessionKeyService, StoredSessionKey } from '../services/sessionKeyService';
import { 
  sessionKeyAdvancedManager, 
  SessionKeyFilter, 
  SessionKeySort, 
  SessionKeyAnalytics,
  SessionKeyBatchOperation 
} from '../services/sessionKeyAdvancedManager';

const getStatusInfo = (status: StoredSessionKey['status']) => {
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

export default function SessionKeyManagerAdvanced() {
  const { account, address } = useAccount();
  const [sessionKeys, setSessionKeys] = useState<StoredSessionKey[]>([]);
  const [filteredKeys, setFilteredKeys] = useState<StoredSessionKey[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [analytics, setAnalytics] = useState<SessionKeyAnalytics | null>(null);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter and sort state
  const [filter, setFilter] = useState<SessionKeyFilter>({});
  const [sort, setSort] = useState<SessionKeySort>({ field: 'createdAt', direction: 'desc' });

  // Load session keys and analytics when component mounts or account changes
  useEffect(() => {
    if (account && address) {
      loadSessionKeys();
      loadAnalytics();
    }
  }, [account, address]);

  // Apply filters and sorting when data or filters change
  useEffect(() => {
    if (sessionKeys.length > 0) {
      const filtered = sessionKeyAdvancedManager.filterAndSortSessionKeys(
        sessionKeys,
        { ...filter, searchTerm },
        sort
      );
      setFilteredKeys(filtered);
    }
  }, [sessionKeys, filter, sort, searchTerm]);

  const loadSessionKeys = () => {
    if (!address) return;
    
    const keys = sessionKeyService.getStoredSessionKeys(address);
    if (keys.length === 0) {
      // Create mock keys for demo if none exist
      sessionKeyService.createMockSessionKeys(address);
      const mockKeys = sessionKeyService.getStoredSessionKeys(address);
      setSessionKeys(mockKeys);
    } else {
      setSessionKeys(keys);
    }
  };

  const loadAnalytics = () => {
    if (!address) return;
    
    const analyticsData = sessionKeyAdvancedManager.generateAnalytics(address);
    setAnalytics(analyticsData);
  };

  const handleKeySelection = (keyId: string, selected: boolean) => {
    const newSelection = new Set(selectedKeys);
    if (selected) {
      newSelection.add(keyId);
    } else {
      newSelection.delete(keyId);
    }
    setSelectedKeys(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedKeys.size === filteredKeys.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredKeys.map(key => key.id)));
    }
  };

  const handleBatchOperation = async (operation: SessionKeyBatchOperation) => {
    if (!address || selectedKeys.size === 0) return;

    setLoading(prev => ({ ...prev, batch: true }));
    
    try {
      const result = await sessionKeyAdvancedManager.executeBatchOperation(address, operation);
      
      // Refresh data
      loadSessionKeys();
      loadAnalytics();
      
      // Clear selection
      setSelectedKeys(new Set());
      
      // Show result notification
      console.log('Batch operation result:', result);
    } catch (error) {
      console.error('Batch operation failed:', error);
    } finally {
      setLoading(prev => ({ ...prev, batch: false }));
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    setLoading(prev => ({ ...prev, [keyId]: true }));
    
    try {
      const sessionKey = sessionKeys.find(key => key.id === keyId);
      if (sessionKey) {
        await sessionKeyService.revokeSessionKey(sessionKey);
        loadSessionKeys();
        loadAnalytics();
      }
    } catch (error) {
      console.error('Failed to revoke session key:', error);
    } finally {
      setLoading(prev => ({ ...prev, [keyId]: false }));
    }
  };

  const handleExportKeys = (format: 'json' | 'csv' | 'pdf') => {
    if (!address) return;
    
    try {
      const exportData = sessionKeyAdvancedManager.exportSessionKeys(address, format, filter);
      
      if (typeof exportData === 'string') {
        // For JSON and CSV
        const blob = new Blob([exportData], { 
          type: format === 'json' ? 'application/json' : 'text/csv' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-keys-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // For PDF (Blob)
        const url = URL.createObjectURL(exportData);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-keys-${Date.now()}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getSecurityAudit = () => {
    if (!address) return null;
    return sessionKeyAdvancedManager.performSecurityAudit(address);
  };

  const getExpiringSoon = () => {
    if (!address) return [];
    return sessionKeyAdvancedManager.getExpiringSoon(address, 24);
  };

  const getRecommendations = () => {
    if (!address) return null;
    return sessionKeyAdvancedManager.getSessionKeyRecommendations(address);
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

  const securityAudit = getSecurityAudit();
  const expiringSoon = getExpiringSoon();
  const recommendations = getRecommendations();

  return (
    <div className="space-y-6">
      {/* Enhanced Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Keys</p>
                <p className="text-2xl font-bold">{analytics?.totalKeys || 0}</p>
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
                <p className="text-2xl font-bold text-green-600">{analytics?.activeKeys || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Earnings</p>
                <p className="text-2xl font-bold text-purple-600">
                  {(analytics?.totalEarnings || 0).toFixed(4)} ETH
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Security Score</p>
                <p className={`text-2xl font-bold ${
                  (securityAudit?.score || 0) >= 80 ? 'text-green-600' : 
                  (securityAudit?.score || 0) >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {securityAudit?.score || 0}/100
                </p>
              </div>
              <Shield className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Notifications */}
      {expiringSoon.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h4 className="font-semibold text-yellow-800">Session Keys Expiring Soon</h4>
            </div>
            <p className="text-yellow-700 mb-3">
              {expiringSoon.length} session key{expiringSoon.length > 1 ? 's' : ''} will expire within 24 hours
            </p>
            <div className="flex flex-wrap gap-2">
              {expiringSoon.slice(0, 3).map(key => (
                <Badge key={key.id} variant="outline" className="text-yellow-700 border-yellow-300">
                  {key.description.slice(0, 20)}...
                </Badge>
              ))}
              {expiringSoon.length > 3 && (
                <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                  +{expiringSoon.length - 3} more
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-1"
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Button>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportKeys('json')}
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportKeys('csv')}
              className="flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              CSV
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search session keys..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadSessionKeys();
              loadAnalytics();
            }}
            className="flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Batch Operations */}
      {selectedKeys.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800">
                  {selectedKeys.size} session key{selectedKeys.size > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBatchOperation({
                    type: 'export',
                    sessionKeyIds: Array.from(selectedKeys)
                  })}
                  disabled={loading.batch}
                  className="flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  Export Selected
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleBatchOperation({
                    type: 'revoke',
                    sessionKeyIds: Array.from(selectedKeys)
                  })}
                  disabled={loading.batch}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Revoke Selected
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Panel */}
      {showAnalytics && analytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Session Key Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Popular Permissions</h4>
                <div className="space-y-2">
                  {analytics.popularPermissions.slice(0, 5).map(({ permission, count }) => (
                    <div key={permission} className="flex justify-between items-center">
                      <Badge variant="outline">{permission}</Badge>
                      <span className="text-sm text-gray-600">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Performance Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Average Price:</span>
                    <span className="font-medium">{analytics.averagePrice.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Duration:</span>
                    <span className="font-medium">{Math.round(analytics.averageDuration)}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-medium">
                      {analytics.totalKeys > 0 
                        ? Math.round((analytics.rentedKeys / analytics.totalKeys) * 100)
                        : 0}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Recommendations</h4>
                {recommendations && (
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-gray-600">Suggested Price:</span>
                      <span className="ml-2 font-medium">{recommendations.suggestedPrice} ETH</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Suggested Duration:</span>
                      <span className="ml-2 font-medium">{recommendations.suggestedDuration}h</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {recommendations.reasoning}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Keys List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Your Session Keys ({filteredKeys.length})
          </h3>
          
          {filteredKeys.length > 0 && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedKeys.size === filteredKeys.length && filteredKeys.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm text-gray-600">Select All</label>
            </div>
          )}
        </div>
        
        {filteredKeys.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Key className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {sessionKeys.length === 0 ? 'No Session Keys' : 'No Matching Session Keys'}
              </h3>
              <p className="text-gray-600 mb-6">
                {sessionKeys.length === 0 
                  ? "You haven't created any session keys yet"
                  : "Try adjusting your search or filter criteria"
                }
              </p>
              {sessionKeys.length === 0 && (
                <Button>Create Your First Session Key</Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredKeys.map((sessionKey) => {
              const statusInfo = getStatusInfo(sessionKey.status);
              const StatusIcon = statusInfo.icon;
              const isExpiringSoon = sessionKey.expiresAt - Date.now() < 2 * 60 * 60 * 1000; // 2 hours
              const isSelected = selectedKeys.has(sessionKey.id);
              
              return (
                <Card key={sessionKey.id} className={`${statusInfo.borderColor} border-2 ${
                  isSelected ? 'ring-2 ring-blue-500' : ''
                }`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleKeySelection(sessionKey.id, e.target.checked)}
                          className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
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
                        onClick={() => navigator.clipboard.writeText(sessionKey.id)}
                        className="flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy ID
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const exportData = sessionKeyService.exportSessionKey(sessionKey);
                          const blob = new Blob([exportData], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `session-key-${sessionKey.id.slice(0, 8)}.json`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        }}
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
