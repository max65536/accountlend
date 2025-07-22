import { cacheService } from './cacheService';
import { blockchainEventService } from './blockchainEventService';
import { sessionKeyService } from './sessionKeyService';
import { transactionService, TransactionInfo } from './transactionService';

export interface SyncConfig {
  interval: number; // milliseconds
  enabled: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface SyncTask {
  id: string;
  name: string;
  execute: () => Promise<void>;
  config: SyncConfig;
  lastRun?: number;
  nextRun?: number;
  isRunning: boolean;
  errors: number;
  maxErrors: number;
}

export class BackgroundSyncService {
  private tasks = new Map<string, SyncTask>();
  private syncInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private readonly SYNC_CHECK_INTERVAL = 5000; // Check every 5 seconds

  constructor() {
    this.initializeDefaultTasks();
  }

  /**
   * Initialize default sync tasks
   */
  private initializeDefaultTasks(): void {
    // Marketplace data sync
    this.addTask({
      id: 'marketplace_sync',
      name: 'Marketplace Data Sync',
      execute: this.syncMarketplaceData.bind(this),
      config: {
        interval: 30000, // 30 seconds
        enabled: true,
        priority: 'medium'
      },
      isRunning: false,
      errors: 0,
      maxErrors: 3
    });

    // Session keys sync
    this.addTask({
      id: 'session_keys_sync',
      name: 'Session Keys Sync',
      execute: this.syncSessionKeys.bind(this),
      config: {
        interval: 60000, // 1 minute
        enabled: true,
        priority: 'medium'
      },
      isRunning: false,
      errors: 0,
      maxErrors: 3
    });

    // Transaction status sync
    this.addTask({
      id: 'transaction_sync',
      name: 'Transaction Status Sync',
      execute: this.syncTransactionStatus.bind(this),
      config: {
        interval: 15000, // 15 seconds
        enabled: true,
        priority: 'high'
      },
      isRunning: false,
      errors: 0,
      maxErrors: 5
    });

    // Blockchain stats sync
    this.addTask({
      id: 'blockchain_stats_sync',
      name: 'Blockchain Stats Sync',
      execute: this.syncBlockchainStats.bind(this),
      config: {
        interval: 120000, // 2 minutes
        enabled: true,
        priority: 'low'
      },
      isRunning: false,
      errors: 0,
      maxErrors: 2
    });

    // Cache cleanup
    this.addTask({
      id: 'cache_cleanup',
      name: 'Cache Cleanup',
      execute: this.cleanupCache.bind(this),
      config: {
        interval: 300000, // 5 minutes
        enabled: true,
        priority: 'low'
      },
      isRunning: false,
      errors: 0,
      maxErrors: 1
    });
  }

  /**
   * Add a sync task
   */
  addTask(task: SyncTask): void {
    task.nextRun = Date.now() + task.config.interval;
    this.tasks.set(task.id, task);
  }

  /**
   * Remove a sync task
   */
  removeTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  /**
   * Update task configuration
   */
  updateTaskConfig(taskId: string, config: Partial<SyncConfig>): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.config = { ...task.config, ...config };
    
    // Recalculate next run time if interval changed
    if (config.interval) {
      task.nextRun = Date.now() + config.interval;
    }

    return true;
  }

  /**
   * Start background synchronization
   */
  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    console.log('Starting background sync service');

    this.syncInterval = setInterval(() => {
      this.processTasks();
    }, this.SYNC_CHECK_INTERVAL);

    // Run initial sync for high priority tasks
    this.runHighPriorityTasks();
  }

  /**
   * Stop background synchronization
   */
  stop(): void {
    if (!this.isActive) return;

    this.isActive = false;
    console.log('Stopping background sync service');

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Process all tasks and run those that are due
   */
  private async processTasks(): Promise<void> {
    if (!this.isActive) return;

    const now = Date.now();
    const tasksToRun: SyncTask[] = [];

    // Find tasks that are due to run
    this.tasks.forEach(task => {
      if (
        task.config.enabled &&
        !task.isRunning &&
        task.errors < task.maxErrors &&
        task.nextRun &&
        now >= task.nextRun
      ) {
        tasksToRun.push(task);
      }
    });

    // Sort by priority
    tasksToRun.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.config.priority] - priorityOrder[b.config.priority];
    });

    // Run tasks
    for (const task of tasksToRun) {
      await this.runTask(task);
    }
  }

  /**
   * Run a specific task
   */
  private async runTask(task: SyncTask): Promise<void> {
    if (task.isRunning) return;

    task.isRunning = true;
    task.lastRun = Date.now();

    try {
      console.log(`Running sync task: ${task.name}`);
      await task.execute();
      
      // Reset error count on success
      task.errors = 0;
      
      // Schedule next run
      task.nextRun = Date.now() + task.config.interval;
      
    } catch (error) {
      console.error(`Sync task ${task.name} failed:`, error);
      task.errors++;
      
      // Exponential backoff for failed tasks
      const backoffMultiplier = Math.pow(2, task.errors);
      task.nextRun = Date.now() + (task.config.interval * backoffMultiplier);
      
      // Disable task if too many errors
      if (task.errors >= task.maxErrors) {
        console.error(`Disabling sync task ${task.name} due to too many errors`);
        task.config.enabled = false;
      }
    } finally {
      task.isRunning = false;
    }
  }

  /**
   * Run high priority tasks immediately
   */
  private async runHighPriorityTasks(): Promise<void> {
    const highPriorityTasks = Array.from(this.tasks.values()).filter(
      task => task.config.priority === 'high' && task.config.enabled
    );

    for (const task of highPriorityTasks) {
      await this.runTask(task);
    }
  }

  /**
   * Sync marketplace data
   */
  private async syncMarketplaceData(): Promise<void> {
    try {
      const listings = await blockchainEventService.getActiveMarketplaceListings();
      const stats = await blockchainEventService.getMarketplaceStats();
      
      // Cache the results for all users (generic cache)
      cacheService.set('marketplace_listings_global', listings, { ttl: 2 * 60 * 1000 });
      cacheService.cacheBlockchainStats(stats);
      
      console.log(`Synced ${listings.length} marketplace listings`);
    } catch (error) {
      console.error('Failed to sync marketplace data:', error);
      throw error;
    }
  }

  /**
   * Sync session keys for active users
   */
  private async syncSessionKeys(): Promise<void> {
    try {
      // Get active user addresses from recent transactions or cache
      const activeUsers = this.getActiveUserAddresses();
      
      for (const userAddress of activeUsers) {
        try {
          const sessionKeys = await blockchainEventService.getUserSessionKeys(userAddress);
          cacheService.cacheUserSessionKeys(userAddress, sessionKeys);
        } catch (error) {
          console.error(`Failed to sync session keys for user ${userAddress}:`, error);
          // Continue with other users
        }
      }
      
      console.log(`Synced session keys for ${activeUsers.length} users`);
    } catch (error) {
      console.error('Failed to sync session keys:', error);
      throw error;
    }
  }

  /**
   * Sync transaction statuses
   */
  private async syncTransactionStatus(): Promise<void> {
    try {
      const pendingTransactions = transactionService.getPendingTransactions();
      
      // Transaction status updates are handled automatically by the transaction service
      // This sync task just ensures the monitoring is active
      console.log(`Monitoring ${pendingTransactions.length} pending transactions`);
    } catch (error) {
      console.error('Failed to sync transaction status:', error);
      throw error;
    }
  }

  /**
   * Sync blockchain statistics
   */
  private async syncBlockchainStats(): Promise<void> {
    try {
      const stats = await blockchainEventService.getMarketplaceStats();
      cacheService.cacheBlockchainStats(stats);
      
      console.log('Synced blockchain statistics');
    } catch (error) {
      console.error('Failed to sync blockchain stats:', error);
      throw error;
    }
  }

  /**
   * Clean up expired cache entries
   */
  private async cleanupCache(): Promise<void> {
    try {
      cacheService.cleanup();
      console.log('Cache cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup cache:', error);
      throw error;
    }
  }

  /**
   * Get active user addresses (simplified implementation)
   */
  private getActiveUserAddresses(): string[] {
    // In production, this would get addresses from recent transactions,
    // active sessions, or other activity indicators
    const stats = transactionService.getTransactionStats();
    const recentTransactions = stats.recentActivity;
    const activeUsers = new Set<string>();
    
    recentTransactions.forEach((tx: TransactionInfo) => {
      if (tx.from) activeUsers.add(tx.from);
      if (tx.to) activeUsers.add(tx.to);
    });
    
    return Array.from(activeUsers);
  }

  /**
   * Force run a specific task
   */
  async forceRunTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    await this.runTask(task);
    return true;
  }

  /**
   * Get sync service statistics
   */
  getStats(): {
    isActive: boolean;
    totalTasks: number;
    enabledTasks: number;
    runningTasks: number;
    failedTasks: number;
    tasks: Array<{
      id: string;
      name: string;
      enabled: boolean;
      isRunning: boolean;
      errors: number;
      lastRun?: number;
      nextRun?: number;
      priority: string;
    }>;
  } {
    const tasks = Array.from(this.tasks.values());
    
    return {
      isActive: this.isActive,
      totalTasks: tasks.length,
      enabledTasks: tasks.filter(t => t.config.enabled).length,
      runningTasks: tasks.filter(t => t.isRunning).length,
      failedTasks: tasks.filter(t => t.errors >= t.maxErrors).length,
      tasks: tasks.map(task => ({
        id: task.id,
        name: task.name,
        enabled: task.config.enabled,
        isRunning: task.isRunning,
        errors: task.errors,
        lastRun: task.lastRun,
        nextRun: task.nextRun,
        priority: task.config.priority
      }))
    };
  }

  /**
   * Enable/disable a task
   */
  toggleTask(taskId: string, enabled: boolean): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.config.enabled = enabled;
    
    if (enabled) {
      // Reset errors and schedule next run
      task.errors = 0;
      task.nextRun = Date.now() + task.config.interval;
    }

    return true;
  }

  /**
   * Reset task errors
   */
  resetTaskErrors(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.errors = 0;
    task.config.enabled = true;
    task.nextRun = Date.now() + task.config.interval;

    return true;
  }
}

// Export singleton instance
export const backgroundSyncService = new BackgroundSyncService();

// Auto-start sync service when module is loaded (only in browser environment)
if (typeof window !== 'undefined') {
  // Delay start to ensure all services are initialized
  setTimeout(() => {
    backgroundSyncService.start();
  }, 1000);
  
  // Stop sync service when page is unloaded
  window.addEventListener('beforeunload', () => {
    backgroundSyncService.stop();
  });
}
