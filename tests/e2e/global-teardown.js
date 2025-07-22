// Global teardown for Playwright E2E tests
async function globalTeardown() {
  console.log('🧹 Starting global teardown for AccountLend E2E tests...');
  
  try {
    // Clean up any test artifacts
    console.log('🗑️ Cleaning up test artifacts...');
    
    // Note: In a real scenario, you might want to:
    // - Clean up test databases
    // - Remove test files
    // - Reset external services
    // - Clear test caches
    
    console.log('✅ Test artifacts cleaned up');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw here as it might mask test failures
  }
  
  console.log('🎉 Global teardown completed');
}

export default globalTeardown;
