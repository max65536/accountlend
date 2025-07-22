// Generate test data for AccountLend marketplace without network dependencies
const fs = require('fs');

function generateTestData() {
  console.log('🧪 Generating Test Data for AccountLend Marketplace...\n');
  
  // Load test accounts if they exist
  let accounts = [];
  try {
    const testAccountsData = JSON.parse(fs.readFileSync('test_accounts.json', 'utf8'));
    accounts = testAccountsData.accounts;
    console.log(`✅ Loaded ${accounts.length} test accounts\n`);
  } catch (error) {
    console.log('⚠️  No test accounts found, creating mock accounts...\n');
    // Create mock accounts
    accounts = [
      {
        id: 1,
        address: '0xf2d38599077956e8ba56f4765a81e7b0dbc10c7a58b910b4a707014579381a6',
        role: 'Session Key Creator'
      },
      {
        id: 2,
        address: '0x641427b6c7ab7450e3cb124c098161e52dba8674ebf95fd14758c8543ea11f7',
        role: 'Session Key Renter'
      },
      {
        id: 3,
        address: '0xb22eaea2ba5e639b1364e257ea838e44d8185175b6d416f03460ae71a256150',
        role: 'Marketplace Participant'
      }
    ];
  }
  
  // Generate session keys for each account
  const sessionKeys = [];
  const marketplaceListings = [];
  
  const sessionKeyTemplates = [
    {
      description: 'DeFi Trading Session - Swap & Transfer',
      permissions: ['transfer', 'swap'],
      duration: 24,
      price: '0.001',
      category: 'DeFi'
    },
    {
      description: 'Gaming Session - Play-to-Earn Access',
      permissions: ['gaming', 'transfer'],
      duration: 12,
      price: '0.0005',
      category: 'Gaming'
    },
    {
      description: 'NFT Trading Session - Marketplace Access',
      permissions: ['nft', 'approve', 'transfer'],
      duration: 48,
      price: '0.002',
      category: 'NFT'
    },
    {
      description: 'Staking Session - DeFi Yield Farming',
      permissions: ['stake', 'transfer', 'swap'],
      duration: 72,
      price: '0.0015',
      category: 'DeFi'
    },
    {
      description: 'Multi-Purpose Trading Session',
      permissions: ['transfer', 'approve', 'swap', 'gaming'],
      duration: 168,
      price: '0.003',
      category: 'Multi'
    },
    {
      description: 'Quick Transfer Session - 6 Hours',
      permissions: ['transfer'],
      duration: 6,
      price: '0.0003',
      category: 'Basic'
    },
    {
      description: 'Advanced DeFi Session - All Permissions',
      permissions: ['transfer', 'swap', 'approve', 'stake'],
      duration: 96,
      price: '0.0025',
      category: 'DeFi'
    },
    {
      description: 'NFT Creator Session - Minting & Trading',
      permissions: ['nft', 'approve', 'transfer'],
      duration: 36,
      price: '0.0018',
      category: 'NFT'
    }
  ];
  
  // Create session keys for different accounts
  sessionKeyTemplates.forEach((template, index) => {
    const creator = accounts[index % accounts.length];
    const now = Date.now();
    const createdAt = now - (index * 3600000); // Staggered creation times
    const expiresAt = createdAt + (template.duration * 3600000);
    
    const sessionKey = {
      id: `session_${createdAt}_${Math.random().toString(36).substr(2, 9)}`,
      owner: creator.address,
      ownerRole: creator.role,
      description: template.description,
      permissions: template.permissions,
      duration: template.duration,
      price: template.price,
      category: template.category,
      createdAt: createdAt,
      expiresAt: expiresAt,
      status: expiresAt > now ? 'active' : 'expired',
      transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      // Additional metadata for UI
      timeRemaining: Math.max(0, expiresAt - now),
      isExpiringSoon: (expiresAt - now) < (6 * 3600000), // Less than 6 hours
      permissionCount: template.permissions.length,
      priceInWei: (parseFloat(template.price) * 1e18).toString(),
      formattedDuration: formatDuration(template.duration),
      formattedPrice: `${template.price} ETH`,
      formattedExpiry: new Date(expiresAt).toLocaleString()
    };
    
    sessionKeys.push(sessionKey);
    
    // Store session key for the owner
    storeSessionKeyData(creator.address, sessionKey);
    
    // Create marketplace listing (80% of session keys are listed)
    if (Math.random() > 0.2) {
      const listing = {
        listingId: `listing_${createdAt}_${Math.random().toString(36).substr(2, 9)}`,
        sessionKeyId: sessionKey.id,
        owner: creator.address,
        ownerRole: creator.role,
        price: template.price,
        listedAt: createdAt + (Math.random() * 3600000), // Listed some time after creation
        status: sessionKey.status === 'active' ? 'active' : 'expired',
        description: template.description,
        duration: template.duration,
        permissions: template.permissions,
        category: template.category,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        // UI metadata
        timeRemaining: sessionKey.timeRemaining,
        isExpiringSoon: sessionKey.isExpiringSoon,
        permissionCount: sessionKey.permissionCount,
        formattedDuration: sessionKey.formattedDuration,
        formattedPrice: sessionKey.formattedPrice,
        formattedExpiry: sessionKey.formattedExpiry,
        // Marketplace specific
        views: Math.floor(Math.random() * 100) + 1,
        favorites: Math.floor(Math.random() * 20),
        isHot: Math.random() > 0.7, // 30% chance of being "hot"
        isFeatured: Math.random() > 0.9 // 10% chance of being featured
      };
      
      marketplaceListings.push(listing);
    }
  });
  
  // Store marketplace listings
  fs.writeFileSync('marketplace_listings.json', JSON.stringify(marketplaceListings, null, 2));
  
  // Generate some rental data
  const rentals = [];
  const renterAccount = accounts[1]; // Second account is the renter
  
  // Create 3 rental records
  for (let i = 0; i < 3; i++) {
    const listing = marketplaceListings[i];
    if (listing && listing.status === 'active') {
      const rental = {
        rentalId: `rental_${Date.now() + i}_${Math.random().toString(36).substr(2, 9)}`,
        listingId: listing.listingId,
        sessionKeyId: listing.sessionKeyId,
        renter: renterAccount.address,
        owner: listing.owner,
        price: listing.price,
        rentedAt: Date.now() - ((3 - i) * 3600000), // Rented at different times
        expiresAt: Date.now() + (listing.duration * 3600000),
        status: 'active',
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`,
        // UI metadata
        formattedPrice: listing.formattedPrice,
        formattedDuration: listing.formattedDuration,
        description: listing.description,
        permissions: listing.permissions,
        category: listing.category
      };
      
      rentals.push(rental);
    }
  }
  
  // Store rental data
  storeRentalData(renterAccount.address, rentals);
  
  // Generate transaction history
  const transactions = [];
  
  // Session key creation transactions
  sessionKeys.forEach(sessionKey => {
    transactions.push({
      id: `tx_create_${sessionKey.id}`,
      type: 'session_key_creation',
      hash: sessionKey.transactionHash,
      from: sessionKey.owner,
      timestamp: sessionKey.createdAt,
      status: 'confirmed',
      description: `Created session key: ${sessionKey.description}`,
      amount: '0',
      fee: (Math.random() * 0.001 + 0.0001).toFixed(6),
      blockNumber: Math.floor(Math.random() * 1000000) + 500000,
      sessionKeyId: sessionKey.id
    });
  });
  
  // Marketplace listing transactions
  marketplaceListings.forEach(listing => {
    transactions.push({
      id: `tx_list_${listing.listingId}`,
      type: 'marketplace_listing',
      hash: listing.transactionHash,
      from: listing.owner,
      timestamp: listing.listedAt,
      status: 'confirmed',
      description: `Listed session key in marketplace: ${listing.description}`,
      amount: listing.price,
      fee: (Math.random() * 0.0005 + 0.00005).toFixed(6),
      blockNumber: Math.floor(Math.random() * 1000000) + 500000,
      listingId: listing.listingId
    });
  });
  
  // Rental transactions
  rentals.forEach(rental => {
    transactions.push({
      id: `tx_rent_${rental.rentalId}`,
      type: 'session_key_rental',
      hash: rental.transactionHash,
      from: rental.renter,
      to: rental.owner,
      timestamp: rental.rentedAt,
      status: 'confirmed',
      description: `Rented session key: ${rental.description}`,
      amount: rental.price,
      fee: (Math.random() * 0.0005 + 0.00005).toFixed(6),
      blockNumber: Math.floor(Math.random() * 1000000) + 500000,
      rentalId: rental.rentalId
    });
  });
  
  // Sort transactions by timestamp (newest first)
  transactions.sort((a, b) => b.timestamp - a.timestamp);
  
  // Store transaction history for each account
  accounts.forEach(account => {
    const accountTransactions = transactions.filter(tx => 
      tx.from === account.address || tx.to === account.address
    );
    
    if (accountTransactions.length > 0) {
      fs.writeFileSync(
        `transactions_${account.address}.json`, 
        JSON.stringify(accountTransactions, null, 2)
      );
    }
  });
  
  // Create summary statistics
  const stats = {
    totalSessionKeys: sessionKeys.length,
    activeSessionKeys: sessionKeys.filter(sk => sk.status === 'active').length,
    expiredSessionKeys: sessionKeys.filter(sk => sk.status === 'expired').length,
    totalListings: marketplaceListings.length,
    activeListings: marketplaceListings.filter(l => l.status === 'active').length,
    totalRentals: rentals.length,
    totalTransactions: transactions.length,
    totalVolume: marketplaceListings.reduce((sum, l) => sum + parseFloat(l.price), 0).toFixed(4),
    averagePrice: (marketplaceListings.reduce((sum, l) => sum + parseFloat(l.price), 0) / marketplaceListings.length).toFixed(4),
    categories: [...new Set(sessionKeys.map(sk => sk.category))],
    generatedAt: new Date().toISOString()
  };
  
  fs.writeFileSync('marketplace_stats.json', JSON.stringify(stats, null, 2));
  
  // Print results
  console.log('✅ Test Data Generation Complete!\n');
  console.log('📊 Generated Data Summary:');
  console.log(`   Session Keys: ${stats.totalSessionKeys} (${stats.activeSessionKeys} active, ${stats.expiredSessionKeys} expired)`);
  console.log(`   Marketplace Listings: ${stats.totalListings} (${stats.activeListings} active)`);
  console.log(`   Rentals: ${stats.totalRentals}`);
  console.log(`   Transactions: ${stats.totalTransactions}`);
  console.log(`   Total Volume: ${stats.totalVolume} ETH`);
  console.log(`   Average Price: ${stats.averagePrice} ETH`);
  console.log(`   Categories: ${stats.categories.join(', ')}\n`);
  
  console.log('📁 Generated Files:');
  console.log('   ✅ marketplace_listings.json - Marketplace data');
  console.log('   ✅ marketplace_stats.json - Statistics');
  accounts.forEach(account => {
    console.log(`   ✅ sessionKeys_${account.address}.json - Session keys for ${account.role}`);
    const txFile = `transactions_${account.address}.json`;
    if (fs.existsSync(txFile)) {
      console.log(`   ✅ ${txFile} - Transaction history`);
    }
  });
  console.log(`   ✅ rentals_${accounts[1].address}.json - Rental history\n`);
  
  console.log('🎯 Next Steps:');
  console.log('1. Open http://localhost:3001 in your browser');
  console.log('2. The marketplace should now show populated test data');
  console.log('3. Navigate through different tabs to see session keys, history, etc.');
  console.log('4. Test the UI with realistic data\n');
  
  return stats;
}

function formatDuration(hours) {
  if (hours < 24) {
    return `${hours}h`;
  } else if (hours < 168) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  } else {
    const weeks = Math.floor(hours / 168);
    const remainingDays = Math.floor((hours % 168) / 24);
    return remainingDays > 0 ? `${weeks}w ${remainingDays}d` : `${weeks}w`;
  }
}

function storeSessionKeyData(ownerAddress, sessionKey) {
  try {
    const storageKey = `sessionKeys_${ownerAddress}`;
    let existingKeys = [];
    
    try {
      const stored = fs.readFileSync(`${storageKey}.json`, 'utf8');
      existingKeys = JSON.parse(stored);
    } catch (e) {
      // File doesn't exist, start with empty array
    }
    
    existingKeys.push(sessionKey);
    fs.writeFileSync(`${storageKey}.json`, JSON.stringify(existingKeys, null, 2));
  } catch (error) {
    console.error('Failed to store session key data:', error.message);
  }
}

function storeRentalData(renterAddress, rentals) {
  try {
    const storageKey = `rentals_${renterAddress}`;
    fs.writeFileSync(`${storageKey}.json`, JSON.stringify(rentals, null, 2));
  } catch (error) {
    console.error('Failed to store rental data:', error.message);
  }
}

// Run the script
if (require.main === module) {
  generateTestData();
}

module.exports = { generateTestData };
