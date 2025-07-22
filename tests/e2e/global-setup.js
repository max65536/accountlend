// Global setup for Playwright E2E tests
import { chromium } from '@playwright/test';

async function globalSetup() {
  console.log('🚀 Starting global setup for AccountLend E2E tests...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Wait for the development server to be ready
    console.log('⏳ Waiting for development server...');
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle' });
    
    // Verify the application loads correctly
    await page.waitForSelector('h1', { timeout: 30000 });
    console.log('✅ Application is ready for testing');
    
    // Pre-populate any necessary test data
    await page.evaluate(() => {
      // Clear any existing data
      localStorage.clear();
      sessionStorage.clear();
      
      // Set up test environment flags
      localStorage.setItem('test-mode', 'true');
      localStorage.setItem('demo-data-enabled', 'true');
    });
    
    console.log('✅ Test environment prepared');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
  
  console.log('🎉 Global setup completed successfully');
}

export default globalSetup;
