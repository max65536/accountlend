import { RpcProvider, TransactionStatus, GetTransactionReceiptResponse } from 'starknet';
import { getCurrentNetworkConfig } from '../config/contracts';

export interface TransactionInfo {
  hash: string;
  type: 'session_create' | 'session_rent' | 'session_revoke' | 'marketplace_list' | 'earnings_withdraw';
  status: 'pending' | 'confirmed' | 'failed' | 'rejected';
  timestamp: number;
  description: string;
  amount?: string;
  from?: string;
  to?: string;
  sessionKeyId?: string;
  error?: string;
}

export interface TransactionNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
  autoHide?: boolean;
  duration?: number;
  actionLabel?: string;
  actionUrl?: string;
}

export class TransactionService {
  private provider: RpcProvider;
  private transactions: Map<string, TransactionInfo> = new Map();
  private notifications: TransactionNotification[] = [];
  private listeners: Set<(transactions: TransactionInfo[]) => void> = new Set();
  private notificationListeners: Set<(notifications: TransactionNotification[]) => void> = new Set();

  constructor() {
    const networkConfig = getCurrentNetworkConfig();
    this.provider = new RpcProvider({ nodeUrl: networkConfig.rpcUrl });
    
    // Load stored transactions
    this.loadStoredTransactions();
    
    // Start monitoring pending transactions
    this.startTransactionMonitoring();
  }

  /**
   * Add a new transaction to track
   */
  addTransaction(transaction: Omit<TransactionInfo, 'timestamp' | 'status'>): void {
    const txInfo: TransactionInfo = {
      ...transaction,
      timestamp: Date.now(),
      status: 'pending'
    };

    this.transactions.set(transaction.hash, txInfo);
    this.saveTransactions();
    this.notifyListeners();

    // Add notification for new transaction
    this.addNotification({
      type: 'info',
      title: 'Transaction Submitted',
      message: `${transaction.description} transaction has been submitted to the network.`,
      autoHide: true,
      duration: 5000,
      actionLabel: 'View on Explorer',
      actionUrl: this.getExplorerUrl(transaction.hash)
    });

    // Start monitoring this transaction
    this.monitorTransaction(transaction.hash);
  }

  /**
   * Get all transactions
   */
  getTransactions(): TransactionInfo[] {
    return Array.from(this.transactions.values()).sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get transactions by type
   */
  getTransactionsByType(type: TransactionInfo['type']): TransactionInfo[] {
    return this.getTransactions().filter(tx => tx.type === type);
  }

  /**
   * Get pending transactions
   */
  getPendingTransactions(): TransactionInfo[] {
    return this.getTransactions().filter(tx => tx.status === 'pending');
  }

  /**
   * Subscribe to transaction updates
   */
  subscribe(listener: (transactions: TransactionInfo[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to notification updates
   */
  subscribeToNotifications(listener: (notifications: TransactionNotification[]) => void): () => void {
    this.notificationListeners.add(listener);
    return () => this.notificationListeners.delete(listener);
  }

  /**
   * Add a notification
   */
  addNotification(notification: Omit<TransactionNotification, 'id' | 'timestamp'>): void {
    const notif: TransactionNotification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    };

    this.notifications.unshift(notif);
    
    // Keep only last 50 notifications
    if (this.notifications.length > 50) {
      this.notifications = this.notifications.slice(0, 50);
    }

    this.notifyNotificationListeners();

    // Auto-hide notification if specified
    if (notification.autoHide) {
      setTimeout(() => {
        this.removeNotification(notif.id);
      }, notification.duration || 5000);
    }
  }

  /**
   * Remove a notification
   */
  removeNotification(id: string): void {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyNotificationListeners();
  }

  /**
   * Get all notifications
   */
  getNotifications(): TransactionNotification[] {
    return this.notifications;
  }

  /**
   * Clear all notifications
   */
  clearNotifications(): void {
    this.notifications = [];
    this.notifyNotificationListeners();
  }

  /**
   * Monitor a specific transaction
   */
  private async monitorTransaction(hash: string): Promise<void> {
    const maxAttempts = 60; // Monitor for up to 10 minutes (60 * 10s)
    let attempts = 0;

    const checkTransaction = async (): Promise<void> => {
      try {
        const receipt = await this.provider.getTransactionReceipt(hash);
        const transaction = this.transactions.get(hash);
        
        if (!transaction) return;

        if (receipt.execution_status === 'SUCCEEDED') {
          transaction.status = 'confirmed';
          this.transactions.set(hash, transaction);
          this.saveTransactions();
          this.notifyListeners();

          this.addNotification({
            type: 'success',
            title: 'Transaction Confirmed',
            message: `${transaction.description} has been confirmed on the network.`,
            autoHide: true,
            duration: 7000,
            actionLabel: 'View on Explorer',
            actionUrl: this.getExplorerUrl(hash)
          });
        } else if (receipt.execution_status === 'REVERTED') {
          transaction.status = 'failed';
          transaction.error = 'Transaction was reverted';
          this.transactions.set(hash, transaction);
          this.saveTransactions();
          this.notifyListeners();

          this.addNotification({
            type: 'error',
            title: 'Transaction Failed',
            message: `${transaction.description} failed: Transaction was reverted.`,
            autoHide: false,
            actionLabel: 'View on Explorer',
            actionUrl: this.getExplorerUrl(hash)
          });
        }
      } catch (error) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          const transaction = this.transactions.get(hash);
          if (transaction && transaction.status === 'pending') {
            transaction.status = 'failed';
            transaction.error = 'Transaction monitoring timeout';
            this.transactions.set(hash, transaction);
            this.saveTransactions();
            this.notifyListeners();

            this.addNotification({
              type: 'warning',
              title: 'Transaction Status Unknown',
              message: `${transaction.description} status could not be determined. Please check manually.`,
              autoHide: false,
              actionLabel: 'View on Explorer',
              actionUrl: this.getExplorerUrl(hash)
            });
          }
          return;
        }

        // Retry after 10 seconds
        setTimeout(checkTransaction, 10000);
      }
    };

    // Start checking after 5 seconds
    setTimeout(checkTransaction, 5000);
  }

  /**
   * Start monitoring all pending transactions
   */
  private startTransactionMonitoring(): void {
    const pendingTxs = this.getPendingTransactions();
    pendingTxs.forEach(tx => {
      this.monitorTransaction(tx.hash);
    });
  }

  /**
   * Load stored transactions from localStorage
   */
  private loadStoredTransactions(): void {
    try {
      const stored = localStorage.getItem('accountlend_transactions');
      if (stored) {
        const transactions: TransactionInfo[] = JSON.parse(stored);
        transactions.forEach(tx => {
          this.transactions.set(tx.hash, tx);
        });
      }
    } catch (error) {
      console.error('Failed to load stored transactions:', error);
    }
  }

  /**
   * Save transactions to localStorage
   */
  private saveTransactions(): void {
    try {
      const transactions = Array.from(this.transactions.values());
      localStorage.setItem('accountlend_transactions', JSON.stringify(transactions));
    } catch (error) {
      console.error('Failed to save transactions:', error);
    }
  }

  /**
   * Notify transaction listeners
   */
  private notifyListeners(): void {
    const transactions = this.getTransactions();
    this.listeners.forEach(listener => listener(transactions));
  }

  /**
   * Notify notification listeners
   */
  private notifyNotificationListeners(): void {
    this.notificationListeners.forEach(listener => listener(this.notifications));
  }

  /**
   * Get explorer URL for transaction
   */
  private getExplorerUrl(hash: string): string {
    const networkConfig = getCurrentNetworkConfig();
    const baseUrl = networkConfig.chainId === '0x534e5f5345504f4c4941' 
      ? 'https://sepolia.starkscan.co' 
      : 'https://starkscan.co';
    return `${baseUrl}/tx/${hash}`;
  }

  /**
   * Get transaction statistics
   */
  getTransactionStats(): {
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
    recentActivity: TransactionInfo[];
  } {
    const transactions = this.getTransactions();
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    return {
      total: transactions.length,
      pending: transactions.filter(tx => tx.status === 'pending').length,
      confirmed: transactions.filter(tx => tx.status === 'confirmed').length,
      failed: transactions.filter(tx => tx.status === 'failed').length,
      recentActivity: transactions.filter(tx => tx.timestamp > oneDayAgo).slice(0, 10)
    };
  }

  /**
   * Clear old transactions (older than 30 days)
   */
  clearOldTransactions(): void {
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const currentTxs = Array.from(this.transactions.values());
    
    currentTxs.forEach(tx => {
      if (tx.timestamp < thirtyDaysAgo && tx.status !== 'pending') {
        this.transactions.delete(tx.hash);
      }
    });

    this.saveTransactions();
    this.notifyListeners();
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
