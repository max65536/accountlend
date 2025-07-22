import { MarketplaceListing } from './blockchainEventService';
import { StoredSessionKey } from './sessionKeyService';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
}

export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private defaultConfig: CacheConfig = {
    ttl: 5 * 60 * 1000, // 5 minutes
    maxSize: 1000
  };

  /**
   * Set cache entry with TTL
   */
  set<T>(key: string, data: T, config?: Partial<CacheConfig>): void {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    // Clean up expired entries if cache is getting full
    if (this.cache.size >= finalConfig.maxSize) {
      this.cleanup();
    }
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + finalConfig.ttl
    };
    
    this.cache.set(key, entry);
  }

  /**
   * Get cache entry if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Delete cache entry
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    expiredEntries: number;
  } {
    const now = Date.now();
    let expiredEntries = 0;
    
    this.cache.forEach((entry) => {
      if (now > entry.expiresAt) {
        expiredEntries++;
      }
    });
    
    return {
      size: this.cache.size,
      maxSize: this.defaultConfig.maxSize,
      hitRate: 0, // Would need to track hits/misses for accurate calculation
      expiredEntries
    };
  }

  /**
   * Cache marketplace listings with user-specific key
   */
  cacheMarketplaceListings(userAddress: string, listings: MarketplaceListing[]): void {
    this.set(`marketplace_listings_${userAddress}`, listings, {
      ttl: 2 * 60 * 1000 // 2 minutes for marketplace data
    });
  }

  /**
   * Get cached marketplace listings
   */
  getCachedMarketplaceListings(userAddress: string): MarketplaceListing[] | null {
    return this.get(`marketplace_listings_${userAddress}`);
  }

  /**
   * Cache user session keys
   */
  cacheUserSessionKeys(userAddress: string, sessionKeys: StoredSessionKey[]): void {
    this.set(`user_session_keys_${userAddress}`, sessionKeys, {
      ttl: 1 * 60 * 1000 // 1 minute for user data
    });
  }

  /**
   * Get cached user session keys
   */
  getCachedUserSessionKeys(userAddress: string): StoredSessionKey[] | null {
    return this.get(`user_session_keys_${userAddress}`);
  }

  /**
   * Cache contract call result
   */
  cacheContractCall(contractAddress: string, method: string, params: any[], result: any): void {
    const key = `contract_${contractAddress}_${method}_${JSON.stringify(params)}`;
    this.set(key, result, {
      ttl: 30 * 1000 // 30 seconds for contract calls
    });
  }

  /**
   * Get cached contract call result
   */
  getCachedContractCall(contractAddress: string, method: string, params: any[]): any | null {
    const key = `contract_${contractAddress}_${method}_${JSON.stringify(params)}`;
    return this.get(key);
  }

  /**
   * Cache blockchain stats
   */
  cacheBlockchainStats(stats: any): void {
    this.set('blockchain_stats', stats, {
      ttl: 5 * 60 * 1000 // 5 minutes for stats
    });
  }

  /**
   * Get cached blockchain stats
   */
  getCachedBlockchainStats(): any | null {
    return this.get('blockchain_stats');
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate user-specific cache
   */
  invalidateUserCache(userAddress: string): void {
    this.invalidatePattern(userAddress);
  }

  /**
   * Preload cache with common data
   */
  async preloadCache(userAddress: string, dataLoader: {
    loadMarketplaceListings: () => Promise<MarketplaceListing[]>;
    loadUserSessionKeys: () => Promise<StoredSessionKey[]>;
    loadBlockchainStats: () => Promise<any>;
  }): Promise<void> {
    try {
      // Load data in parallel
      const [marketplaceListings, userSessionKeys, blockchainStats] = await Promise.all([
        dataLoader.loadMarketplaceListings(),
        dataLoader.loadUserSessionKeys(),
        dataLoader.loadBlockchainStats()
      ]);

      // Cache the results
      this.cacheMarketplaceListings(userAddress, marketplaceListings);
      this.cacheUserSessionKeys(userAddress, userSessionKeys);
      this.cacheBlockchainStats(blockchainStats);

      console.log('Cache preloaded successfully');
    } catch (error) {
      console.error('Failed to preload cache:', error);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Auto cleanup every 5 minutes
setInterval(() => {
  cacheService.cleanup();
}, 5 * 60 * 1000);
