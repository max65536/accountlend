import { Account, Call } from 'starknet';
import { sessionKeyService, StoredSessionKey } from './sessionKeyService';
import { transactionService } from './transactionService';
import { cacheService } from './cacheService';

// Advanced session key management interface
export interface SessionKeyFilter {
  status?: StoredSessionKey['status'][];
  permissions?: string[];
  priceRange?: { min: number; max: number };
  durationRange?: { min: number; max: number };
  createdAfter?: number;
  createdBefore?: number;
  expiresAfter?: number;
  expiresBefore?: number;
  searchTerm?: string;
}

export interface SessionKeySort {
  field: 'createdAt' | 'expiresAt' | 'price' | 'duration' | 'earnings';
  direction: 'asc' | 'desc';
}

export interface SessionKeyBatchOperation {
  type: 'revoke' | 'export' | 'extend' | 'reprice';
  sessionKeyIds: string[];
  params?: {
    newPrice?: string;
    extensionHours?: number;
  };
}

export interface SessionKeyAnalytics {
  totalKeys: number;
  activeKeys: number;
  expiredKeys: number;
  revokedKeys: number;
  rentedKeys: number;
  totalEarnings: number;
  averagePrice: number;
  averageDuration: number;
  popularPermissions: { permission: string; count: number }[];
  earningsOverTime: { date: string; earnings: number }[];
  expirationSchedule: { date: string; count: number }[];
}

export class SessionKeyAdvancedManager {
  private cache = cacheService;

  /**
   * Advanced filtering and sorting of session keys
   */
  filterAndSortSessionKeys(
    sessionKeys: StoredSessionKey[],
    filter?: SessionKeyFilter,
    sort?: SessionKeySort
  ): StoredSessionKey[] {
    let filtered = [...sessionKeys];

    // Apply filters
    if (filter) {
      if (filter.status && filter.status.length > 0) {
        filtered = filtered.filter(key => filter.status!.includes(key.status));
      }

      if (filter.permissions && filter.permissions.length > 0) {
        filtered = filtered.filter(key =>
          filter.permissions!.some(permission =>
            key.permissions.includes(permission)
          )
        );
      }

      if (filter.priceRange) {
        const { min, max } = filter.priceRange;
        filtered = filtered.filter(key => {
          const price = parseFloat(key.price);
          return price >= min && price <= max;
        });
      }

      if (filter.durationRange) {
        const { min, max } = filter.durationRange;
        filtered = filtered.filter(key =>
          key.duration >= min && key.duration <= max
        );
      }

      if (filter.createdAfter) {
        filtered = filtered.filter(key => key.createdAt >= filter.createdAfter!);
      }

      if (filter.createdBefore) {
        filtered = filtered.filter(key => key.createdAt <= filter.createdBefore!);
      }

      if (filter.expiresAfter) {
        filtered = filtered.filter(key => key.expiresAt >= filter.expiresAfter!);
      }

      if (filter.expiresBefore) {
        filtered = filtered.filter(key => key.expiresAt <= filter.expiresBefore!);
      }

      if (filter.searchTerm) {
        const searchTerm = filter.searchTerm.toLowerCase();
        filtered = filtered.filter(key =>
          key.description.toLowerCase().includes(searchTerm) ||
          key.id.toLowerCase().includes(searchTerm) ||
          key.permissions.some(p => p.toLowerCase().includes(searchTerm))
        );
      }
    }

    // Apply sorting
    if (sort) {
      filtered.sort((a, b) => {
        let aValue: number;
        let bValue: number;

        switch (sort.field) {
          case 'createdAt':
            aValue = a.createdAt;
            bValue = b.createdAt;
            break;
          case 'expiresAt':
            aValue = a.expiresAt;
            bValue = b.expiresAt;
            break;
          case 'price':
            aValue = parseFloat(a.price);
            bValue = parseFloat(b.price);
            break;
          case 'duration':
            aValue = a.duration;
            bValue = b.duration;
            break;
          case 'earnings':
            aValue = a.earnings || 0;
            bValue = b.earnings || 0;
            break;
          default:
            return 0;
        }

        const result = aValue - bValue;
        return sort.direction === 'asc' ? result : -result;
      });
    }

    return filtered;
  }

  /**
   * Batch operations on multiple session keys
   */
  async executeBatchOperation(
    userAddress: string,
    operation: SessionKeyBatchOperation
  ): Promise<{
    successful: string[];
    failed: { id: string; error: string }[];
  }> {
    const successful: string[] = [];
    const failed: { id: string; error: string }[] = [];

    const sessionKeys = sessionKeyService.getStoredSessionKeys(userAddress);

    for (const sessionKeyId of operation.sessionKeyIds) {
      try {
        const sessionKey = sessionKeys.find(key => key.id === sessionKeyId);
        if (!sessionKey) {
          failed.push({ id: sessionKeyId, error: 'Session key not found' });
          continue;
        }

        switch (operation.type) {
          case 'revoke':
            await sessionKeyService.revokeSessionKey(sessionKey);
            successful.push(sessionKeyId);
            break;

          case 'export':
            sessionKeyService.exportSessionKey(sessionKey);
            successful.push(sessionKeyId);
            break;

          case 'extend':
            if (operation.params?.extensionHours) {
              await this.extendSessionKey(sessionKey, operation.params.extensionHours);
              successful.push(sessionKeyId);
            } else {
              failed.push({ id: sessionKeyId, error: 'Extension hours not provided' });
            }
            break;

          case 'reprice':
            if (operation.params?.newPrice) {
              await this.repriceSessionKey(sessionKey, operation.params.newPrice);
              successful.push(sessionKeyId);
            } else {
              failed.push({ id: sessionKeyId, error: 'New price not provided' });
            }
            break;

          default:
            failed.push({ id: sessionKeyId, error: 'Unknown operation type' });
        }
      } catch (error) {
        failed.push({
          id: sessionKeyId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Track batch operation
    transactionService.addTransaction({
      hash: `batch_${Date.now()}`,
      type: 'session_revoke', // Use closest matching type for batch operations
      description: `Batch ${operation.type} on ${operation.sessionKeyIds.length} session keys`,
      amount: '0'
    });

    return { successful, failed };
  }

  /**
   * Extend session key expiration time
   */
  private async extendSessionKey(sessionKey: StoredSessionKey, extensionHours: number): Promise<void> {
    const extensionMs = extensionHours * 3600 * 1000;
    sessionKey.expiresAt += extensionMs;
    sessionKey.duration += extensionHours;

    // Update stored session key
    const userAddress = sessionKey.owner;
    const existing = sessionKeyService.getStoredSessionKeys(userAddress);
    const updated = existing.map(key =>
      key.id === sessionKey.id ? sessionKey : key
    );

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`sessionKeys_${userAddress}`, JSON.stringify(updated));
    }
  }

  /**
   * Update session key price
   */
  private async repriceSessionKey(sessionKey: StoredSessionKey, newPrice: string): Promise<void> {
    sessionKey.price = newPrice;

    // Update stored session key
    const userAddress = sessionKey.owner;
    const existing = sessionKeyService.getStoredSessionKeys(userAddress);
    const updated = existing.map(key =>
      key.id === sessionKey.id ? sessionKey : key
    );

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(`sessionKeys_${userAddress}`, JSON.stringify(updated));
    }
  }

  /**
   * Generate comprehensive analytics for session keys
   */
  generateAnalytics(userAddress: string): SessionKeyAnalytics {
    const cacheKey = `analytics_${userAddress}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached as SessionKeyAnalytics;
    }

    const sessionKeys = sessionKeyService.getStoredSessionKeys(userAddress);

    // Basic statistics
    const totalKeys = sessionKeys.length;
    const activeKeys = sessionKeys.filter(k => k.status === 'active').length;
    const expiredKeys = sessionKeys.filter(k => k.status === 'expired').length;
    const revokedKeys = sessionKeys.filter(k => k.status === 'revoked').length;
    const rentedKeys = sessionKeys.filter(k => k.status === 'rented').length;

    // Financial analytics
    const totalEarnings = sessionKeys.reduce((sum, k) => sum + (k.earnings || 0), 0);
    const prices = sessionKeys.map(k => parseFloat(k.price)).filter(p => !isNaN(p));
    const averagePrice = prices.length > 0 ? prices.reduce((sum, p) => sum + p, 0) / prices.length : 0;
    const averageDuration = sessionKeys.length > 0 
      ? sessionKeys.reduce((sum, k) => sum + k.duration, 0) / sessionKeys.length 
      : 0;

    // Permission popularity
    const permissionCounts: { [key: string]: number } = {};
    sessionKeys.forEach(key => {
      key.permissions.forEach(permission => {
        permissionCounts[permission] = (permissionCounts[permission] || 0) + 1;
      });
    });

    const popularPermissions = Object.entries(permissionCounts)
      .map(([permission, count]) => ({ permission, count }))
      .sort((a, b) => b.count - a.count);

    // Earnings over time (last 30 days)
    const earningsOverTime = this.generateEarningsOverTime(sessionKeys);

    // Expiration schedule (next 30 days)
    const expirationSchedule = this.generateExpirationSchedule(sessionKeys);

    const analytics: SessionKeyAnalytics = {
      totalKeys,
      activeKeys,
      expiredKeys,
      revokedKeys,
      rentedKeys,
      totalEarnings,
      averagePrice,
      averageDuration,
      popularPermissions,
      earningsOverTime,
      expirationSchedule
    };

    // Cache for 5 minutes
    this.cache.set(cacheKey, analytics, { ttl: 5 * 60 * 1000 });

    return analytics;
  }

  /**
   * Generate earnings over time data
   */
  private generateEarningsOverTime(sessionKeys: StoredSessionKey[]): { date: string; earnings: number }[] {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

    const dailyEarnings: { [date: string]: number } = {};

    // Initialize all days with 0
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo + (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      dailyEarnings[dateStr] = 0;
    }

    // Add earnings from rented session keys
    sessionKeys
      .filter(key => key.status === 'rented' && key.earnings && key.createdAt >= thirtyDaysAgo)
      .forEach(key => {
        const date = new Date(key.createdAt).toISOString().split('T')[0];
        if (dailyEarnings[date] !== undefined) {
          dailyEarnings[date] += key.earnings!;
        }
      });

    return Object.entries(dailyEarnings)
      .map(([date, earnings]) => ({ date, earnings }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Generate expiration schedule data
   */
  private generateExpirationSchedule(sessionKeys: StoredSessionKey[]): { date: string; count: number }[] {
    const now = Date.now();
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000);

    const dailyExpirations: { [date: string]: number } = {};

    // Initialize all days with 0
    for (let i = 0; i < 30; i++) {
      const date = new Date(now + (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      dailyExpirations[dateStr] = 0;
    }

    // Count expirations
    sessionKeys
      .filter(key => key.status === 'active' && key.expiresAt >= now && key.expiresAt <= thirtyDaysFromNow)
      .forEach(key => {
        const date = new Date(key.expiresAt).toISOString().split('T')[0];
        if (dailyExpirations[date] !== undefined) {
          dailyExpirations[date]++;
        }
      });

    return Object.entries(dailyExpirations)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Get session keys expiring soon (within specified hours)
   */
  getExpiringSoon(userAddress: string, withinHours: number = 24): StoredSessionKey[] {
    const sessionKeys = sessionKeyService.getStoredSessionKeys(userAddress);
    const threshold = Date.now() + (withinHours * 60 * 60 * 1000);

    return sessionKeys.filter(key =>
      key.status === 'active' &&
      key.expiresAt <= threshold &&
      key.expiresAt > Date.now()
    );
  }

  /**
   * Get session key recommendations based on user patterns
   */
  getSessionKeyRecommendations(userAddress: string): {
    suggestedPermissions: string[];
    suggestedDuration: number;
    suggestedPrice: string;
    reasoning: string;
  } {
    const sessionKeys = sessionKeyService.getStoredSessionKeys(userAddress);
    const analytics = this.generateAnalytics(userAddress);

    // Most popular permissions
    const suggestedPermissions = analytics.popularPermissions
      .slice(0, 3)
      .map(p => p.permission);

    // Average successful duration (from rented keys)
    const rentedKeys = sessionKeys.filter(k => k.status === 'rented');
    const suggestedDuration = rentedKeys.length > 0
      ? Math.round(rentedKeys.reduce((sum, k) => sum + k.duration, 0) / rentedKeys.length)
      : 24;

    // Optimal price based on successful rentals
    const suggestedPrice = analytics.averagePrice > 0
      ? analytics.averagePrice.toFixed(4)
      : '0.001';

    const reasoning = `Based on your ${sessionKeys.length} session keys, ` +
      `${rentedKeys.length} successful rentals, and popular permissions: ${suggestedPermissions.join(', ')}`;

    return {
      suggestedPermissions,
      suggestedDuration,
      suggestedPrice,
      reasoning
    };
  }

  /**
   * Security audit for session keys
   */
  performSecurityAudit(userAddress: string): {
    issues: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      type: string;
      description: string;
      sessionKeyId?: string;
      recommendation: string;
    }>;
    score: number; // 0-100
  } {
    const sessionKeys = sessionKeyService.getStoredSessionKeys(userAddress);
    const issues: Array<{
      severity: 'low' | 'medium' | 'high' | 'critical';
      type: string;
      description: string;
      sessionKeyId?: string;
      recommendation: string;
    }> = [];

    // Check for overly permissive session keys
    sessionKeys.forEach(key => {
      if (key.permissions.length > 4) {
        issues.push({
          severity: 'medium',
          type: 'overly_permissive',
          description: `Session key "${key.description}" has ${key.permissions.length} permissions`,
          sessionKeyId: key.id,
          recommendation: 'Consider creating separate session keys with fewer permissions'
        });
      }

      // Check for long-duration active keys
      if (key.status === 'active' && key.duration > 168) { // 1 week
        issues.push({
          severity: 'medium',
          type: 'long_duration',
          description: `Session key "${key.description}" has a duration of ${key.duration} hours`,
          sessionKeyId: key.id,
          recommendation: 'Consider shorter durations for better security'
        });
      }

      // Check for keys with wildcard permissions
      if (key.permissions.some(p => ['*', 'all', 'admin'].includes(p.toLowerCase()))) {
        issues.push({
          severity: 'high',
          type: 'wildcard_permissions',
          description: `Session key "${key.description}" has wildcard permissions`,
          sessionKeyId: key.id,
          recommendation: 'Replace wildcard permissions with specific ones'
        });
      }
    });

    // Check for too many active session keys
    const activeKeys = sessionKeys.filter(k => k.status === 'active');
    if (activeKeys.length > 10) {
      issues.push({
        severity: 'low',
        type: 'too_many_active',
        description: `You have ${activeKeys.length} active session keys`,
        recommendation: 'Consider revoking unused session keys'
      });
    }

    // Calculate security score
    const maxScore = 100;
    const deductions = issues.reduce((total, issue) => {
      switch (issue.severity) {
        case 'critical': return total + 25;
        case 'high': return total + 15;
        case 'medium': return total + 10;
        case 'low': return total + 5;
        default: return total;
      }
    }, 0);

    const score = Math.max(0, maxScore - deductions);

    return { issues, score };
  }

  /**
   * Export session keys to various formats
   */
  exportSessionKeys(
    userAddress: string,
    format: 'json' | 'csv' | 'pdf',
    filter?: SessionKeyFilter
  ): string | Blob {
    const sessionKeys = sessionKeyService.getStoredSessionKeys(userAddress);
    const filtered = filter 
      ? this.filterAndSortSessionKeys(sessionKeys, filter)
      : sessionKeys;

    switch (format) {
      case 'json':
        return JSON.stringify(filtered, null, 2);

      case 'csv':
        const headers = ['ID', 'Description', 'Status', 'Permissions', 'Duration', 'Price', 'Created', 'Expires', 'Earnings'];
        const rows = filtered.map(key => [
          key.id,
          key.description,
          key.status,
          key.permissions.join(';'),
          key.duration.toString(),
          key.price,
          new Date(key.createdAt).toISOString(),
          new Date(key.expiresAt).toISOString(),
          (key.earnings || 0).toString()
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');

      case 'pdf':
        // For PDF export, return a simple text format
        // In a real implementation, you'd use a PDF library
        const pdfContent = filtered.map(key => 
          `Session Key: ${key.id}\n` +
          `Description: ${key.description}\n` +
          `Status: ${key.status}\n` +
          `Permissions: ${key.permissions.join(', ')}\n` +
          `Duration: ${key.duration} hours\n` +
          `Price: ${key.price} ETH\n` +
          `Created: ${new Date(key.createdAt).toLocaleString()}\n` +
          `Expires: ${new Date(key.expiresAt).toLocaleString()}\n` +
          `Earnings: ${key.earnings || 0} ETH\n\n`
        ).join('---\n\n');

        return new Blob([pdfContent], { type: 'text/plain' });

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }
}

// Export singleton instance
export const sessionKeyAdvancedManager = new SessionKeyAdvancedManager();
