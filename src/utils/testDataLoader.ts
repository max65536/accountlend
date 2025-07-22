// Utility to load generated test data for marketplace display
// Client-side compatible version without fs dependencies

export interface TestMarketplaceListing {
  listingId: string;
  sessionKeyId: string;
  owner: string;
  ownerRole: string;
  price: string;
  listedAt: number;
  status: string;
  description: string;
  duration: number;
  permissions: string[];
  category: string;
  transactionHash: string;
  timeRemaining: number;
  isExpiringSoon: boolean;
  permissionCount: number;
  formattedDuration: string;
  formattedPrice: string;
  formattedExpiry: string;
  views: number;
  favorites: number;
  isHot: boolean;
  isFeatured: boolean;
}

export interface TestSessionKey {
  id: string;
  owner: string;
  ownerRole: string;
  description: string;
  permissions: string[];
  duration: number;
  price: string;
  category: string;
  createdAt: number;
  expiresAt: number;
  status: string;
  transactionHash: string;
  timeRemaining: number;
  isExpiringSoon: boolean;
  permissionCount: number;
  priceInWei: string;
  formattedDuration: string;
  formattedPrice: string;
  formattedExpiry: string;
}

export interface TestStats {
  totalSessionKeys: number;
  activeSessionKeys: number;
  expiredSessionKeys: number;
  totalListings: number;
  activeListings: number;
  totalRentals: number;
  totalTransactions: number;
  totalVolume: string;
  averagePrice: string;
  categories: string[];
  generatedAt: string;
}

class TestDataLoader {
  private static instance: TestDataLoader;
  private marketplaceListings: TestMarketplaceListing[] = [];
  private sessionKeys: TestSessionKey[] = [];
  private stats: TestStats | null = null;
  private isLoaded = false;

  private constructor() {}

  static getInstance(): TestDataLoader {
    if (!TestDataLoader.instance) {
      TestDataLoader.instance = new TestDataLoader();
    }
    return TestDataLoader.instance;
  }

  // Load test data from generated files (client-side compatible)
  async loadTestData(): Promise<void> {
    if (this.isLoaded) return;

    try {
      // In browser environment, we'll use fetch to load the data
      if (typeof window !== 'undefined') {
        await this.loadClientSideData();
      } else {
        // Server-side loading (for SSR)
        await this.loadServerSideData();
      }
      
      this.isLoaded = true;
    } catch (error) {
      console.warn('Failed to load test data, using fallback:', error);
      this.loadFallbackData();
      this.isLoaded = true;
    }
  }

  private async loadClientSideData(): Promise<void> {
    try {
      // Try to load from public directory or API endpoint
      const response = await fetch('/api/test-data');
      if (response.ok) {
        const data = await response.json();
        this.marketplaceListings = data.marketplaceListings || [];
        this.stats = data.stats || null;
      } else {
        throw new Error('API not available');
      }
    } catch (error) {
      // Fallback to hardcoded data
      this.loadFallbackData();
    }
  }

  private async loadServerSideData(): Promise<void> {
    // Server-side loading not available in this version
    // Always fallback to hardcoded data
    this.loadFallbackData();
  }

  private loadFallbackData(): void {
    // Hardcoded fallback data for when files aren't available
    const now = Date.now();
    
    this.marketplaceListings = [
      {
        listingId: 'listing_fallback_1',
        sessionKeyId: 'session_fallback_1',
        owner: '0xf2d38599077956e8ba56f4765a81e7b0dbc10c7a58b910b4a707014579381a6',
        ownerRole: 'Session Key Creator',
        price: '0.001',
        listedAt: now - 3600000,
        status: 'active',
        description: 'DeFi Trading Session - Swap & Transfer',
        duration: 24,
        permissions: ['transfer', 'swap'],
        category: 'DeFi',
        transactionHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        timeRemaining: 24 * 3600000,
        isExpiringSoon: false,
        permissionCount: 2,
        formattedDuration: '24h',
        formattedPrice: '0.001 ETH',
        formattedExpiry: new Date(now + 24 * 3600000).toLocaleString(),
        views: 45,
        favorites: 8,
        isHot: true,
        isFeatured: false
      },
      {
        listingId: 'listing_fallback_2',
        sessionKeyId: 'session_fallback_2',
        owner: '0x641427b6c7ab7450e3cb124c098161e52dba8674ebf95fd14758c8543ea11f7',
        ownerRole: 'Session Key Renter',
        price: '0.0005',
        listedAt: now - 7200000,
        status: 'active',
        description: 'Gaming Session - Play-to-Earn Access',
        duration: 12,
        permissions: ['gaming', 'transfer'],
        category: 'Gaming',
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        timeRemaining: 12 * 3600000,
        isExpiringSoon: false,
        permissionCount: 2,
        formattedDuration: '12h',
        formattedPrice: '0.0005 ETH',
        formattedExpiry: new Date(now + 12 * 3600000).toLocaleString(),
        views: 23,
        favorites: 3,
        isHot: false,
        isFeatured: true
      },
      {
        listingId: 'listing_fallback_3',
        sessionKeyId: 'session_fallback_3',
        owner: '0xb22eaea2ba5e639b1364e257ea838e44d8185175b6d416f03460ae71a256150',
        ownerRole: 'Marketplace Participant',
        price: '0.002',
        listedAt: now - 10800000,
        status: 'active',
        description: 'NFT Trading Session - Marketplace Access',
        duration: 48,
        permissions: ['nft', 'approve', 'transfer'],
        category: 'NFT',
        transactionHash: '0x567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234',
        timeRemaining: 48 * 3600000,
        isExpiringSoon: false,
        permissionCount: 3,
        formattedDuration: '2d',
        formattedPrice: '0.002 ETH',
        formattedExpiry: new Date(now + 48 * 3600000).toLocaleString(),
        views: 67,
        favorites: 12,
        isHot: true,
        isFeatured: false
      }
    ];

    this.stats = {
      totalSessionKeys: 3,
      activeSessionKeys: 3,
      expiredSessionKeys: 0,
      totalListings: 3,
      activeListings: 3,
      totalRentals: 0,
      totalTransactions: 6,
      totalVolume: '0.0035',
      averagePrice: '0.0012',
      categories: ['DeFi', 'Gaming', 'NFT'],
      generatedAt: new Date().toISOString()
    };
  }

  getMarketplaceListings(): TestMarketplaceListing[] {
    return this.marketplaceListings;
  }

  getActiveListings(): TestMarketplaceListing[] {
    return this.marketplaceListings.filter(listing => listing.status === 'active');
  }

  getListingsByCategory(category: string): TestMarketplaceListing[] {
    return this.marketplaceListings.filter(listing => listing.category === category);
  }

  getFeaturedListings(): TestMarketplaceListing[] {
    return this.marketplaceListings.filter(listing => listing.isFeatured);
  }

  getHotListings(): TestMarketplaceListing[] {
    return this.marketplaceListings.filter(listing => listing.isHot);
  }

  getStats(): TestStats | null {
    return this.stats;
  }

  // Convert test listing to component format
  convertToSessionKeyListing(listing: TestMarketplaceListing) {
    return {
      sessionKey: listing.sessionKeyId,
      owner: listing.owner,
      price: listing.price,
      isActive: listing.status === 'active',
      createdAt: listing.listedAt,
      expiresAt: listing.listedAt + (listing.duration * 3600000),
      permissions: listing.permissions,
      description: listing.description,
      duration: listing.formattedDuration,
      type: 'available' as const,
      category: listing.category,
      views: listing.views,
      favorites: listing.favorites,
      isHot: listing.isHot,
      isFeatured: listing.isFeatured
    };
  }

  // Get sample data for testing without loading files
  getSampleData() {
    this.loadFallbackData();
    return {
      listings: this.marketplaceListings,
      stats: this.stats
    };
  }
}

// Export singleton instance
export const testDataLoader = TestDataLoader.getInstance();

// Convenience functions
export async function loadTestMarketplaceData() {
  await testDataLoader.loadTestData();
  return testDataLoader.getActiveListings().map(listing => 
    testDataLoader.convertToSessionKeyListing(listing)
  );
}

export async function getTestMarketplaceStats() {
  await testDataLoader.loadTestData();
  return testDataLoader.getStats();
}

export function getSampleMarketplaceData() {
  const { listings, stats } = testDataLoader.getSampleData();
  return {
    listings: listings.map(listing => testDataLoader.convertToSessionKeyListing(listing)),
    stats
  };
}
