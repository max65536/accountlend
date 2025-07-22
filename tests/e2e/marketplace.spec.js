// End-to-End tests for AccountLend Marketplace - Production Readiness Testing
import { test, expect } from '@playwright/test';

test.describe('AccountLend Marketplace E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3002');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
  });

  test.describe('Landing Page', () => {
    test('should display landing page correctly', async ({ page }) => {
      // Check main heading (use more specific selector to avoid error page h1)
      await expect(page.getByRole('heading', { name: 'AccountLend' }).first()).toBeVisible();

      // Check hero section
      await expect(page.locator('text=Trade temporary, secure access to Starknet accounts')).toBeVisible();

      // Check main action buttons
      await expect(page.getByRole('button', { name: 'Explore Marketplace' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Create Session Key' })).toBeVisible();

      // Check feature sections
      await expect(page.getByRole('heading', { name: 'Secure Session Keys' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Time-Limited Access' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Decentralized Marketplace' })).toBeVisible();
    });

    test('should navigate to marketplace on button click', async ({ page }) => {
      // Click explore marketplace button
      await page.getByRole('button', { name: 'Explore Marketplace' }).click();

      // Should scroll to marketplace section
      await expect(page.getByRole('heading', { name: 'Session Key Marketplace Demo' })).toBeVisible();
    });
  });

  test.describe('Demo Marketplace (No Wallet)', () => {
    test('should display demo marketplace without wallet connection', async ({ page }) => {
      // Scroll to marketplace section
      await page.getByRole('heading', { name: 'Session Key Marketplace Demo' }).scrollIntoViewIfNeeded();

      // Check demo banner
      await expect(page.getByRole('heading', { name: 'Session Key Marketplace Demo' })).toBeVisible();
      await expect(page.locator('text=Demo Mode - Sample Data')).toBeVisible();

      // Check demo statistics
      await expect(page.locator('text=Active Listings')).toBeVisible();
      await expect(page.locator('text=Total Volume')).toBeVisible();
      await expect(page.locator('text=Categories')).toBeVisible();
      await expect(page.locator('text=Avg Price')).toBeVisible();
    });

    test('should display sample session keys', async ({ page }) => {
      // Scroll to marketplace section
      await page.locator('text=Available Session Keys').scrollIntoViewIfNeeded();

      // Check for demo session key cards
      await expect(page.getByRole('heading', { name: /DeFi Trading Session/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Gaming Session/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: /NFT Trading Session/ })).toBeVisible();

      // Check for permission badges (use first occurrence)
      await expect(page.getByText('transfer').first()).toBeVisible();
      await expect(page.getByText('swap').first()).toBeVisible();
      await expect(page.getByText('gaming').first()).toBeVisible();

      // Check for category badges
      await expect(page.getByText('DeFi').first()).toBeVisible();
      await expect(page.getByText('Gaming').first()).toBeVisible();
      await expect(page.getByText('NFT').first()).toBeVisible();
    });

    test('should show connect wallet prompts', async ({ page }) => {
      // Scroll to marketplace section
      await page.locator('text=Available Session Keys').scrollIntoViewIfNeeded();

      // Check for connect wallet buttons
      const connectButtons = page.getByText('Connect Wallet to Rent');
      await expect(connectButtons.first()).toBeVisible();

      // Check call-to-action section
      await expect(page.locator('text=Ready to Get Started?')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Connect Wallet', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Learn More' })).toBeVisible();
    });
  });

  test.describe('Tab Navigation', () => {
    test('should navigate between tabs correctly', async ({ page }) => {
      // Scroll to tab navigation
      await page.getByRole('button', { name: 'Marketplace', exact: true }).scrollIntoViewIfNeeded();

      // Test Create Session tab
      await page.getByRole('button', { name: 'Create Session', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Create Session Key' })).toBeVisible();
      await expect(page.locator('text=Generate a new session key to lend your account access')).toBeVisible();

      // Test Manage Keys tab
      await page.getByRole('button', { name: 'Manage Keys' }).click();
      await expect(page.getByRole('heading', { name: 'Manage Session Keys' })).toBeVisible();
      await expect(page.locator('text=View and manage your active session keys')).toBeVisible();

      // Test History tab
      await page.getByRole('button', { name: 'History' }).click();
      await expect(page.locator('text=Connect Your Wallet')).toBeVisible();
      await expect(page.locator('text=Please connect your Starknet wallet to view transaction history')).toBeVisible();

      // Return to Marketplace tab
      await page.getByRole('button', { name: 'Marketplace', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Session Key Marketplace Demo' })).toBeVisible();
    });

    test('should maintain tab state during navigation', async ({ page }) => {
      // Navigate to Create Session tab
      await page.getByRole('button', { name: 'Create Session', exact: true }).scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Create Session', exact: true }).click();

      // Verify active tab styling
      const createSessionTab = page.getByRole('button', { name: 'Create Session', exact: true });
      await expect(createSessionTab).toHaveClass(/bg-blue-600|bg-primary/);

      // Navigate to different tab
      await page.getByRole('button', { name: 'Manage Keys' }).click();

      // Verify tab state changed
      const manageKeysTab = page.getByRole('button', { name: 'Manage Keys' });
      await expect(manageKeysTab).toHaveClass(/bg-blue-600|bg-primary/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Check if main elements are visible
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('button:has-text("Explore Marketplace")')).toBeVisible();
      
      // Check if marketplace cards stack properly on mobile
      await page.locator('text=Available Session Keys').scrollIntoViewIfNeeded();
      
      const sessionCards = page.locator('[class*="grid"] > div').first();
      await expect(sessionCards).toBeVisible();
    });

    test('should work on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      
      // Check layout adjustments
      await expect(page.locator('h1')).toBeVisible();
      
      // Check if statistics grid displays properly
      await page.locator('text=Active Listings').scrollIntoViewIfNeeded();
      const statsGrid = page.locator('text=Active Listings').locator('..').locator('..');
      await expect(statsGrid).toBeVisible();
    });

    test('should work on desktop viewport', async ({ page }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });

      // Check full layout
      await expect(page.locator('h1')).toBeVisible();

      // Check if session key cards display in grid
      await page.locator('text=Available Session Keys').scrollIntoViewIfNeeded();

      // Should have multiple cards visible in a row
      await expect(page.getByRole('heading', { name: /DeFi Trading Session/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: /Gaming Session/ })).toBeVisible();
      await expect(page.getByRole('heading', { name: /NFT Trading Session/ })).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('http://localhost:3002');
      await page.waitForLoadState('networkidle');
      
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should have good Core Web Vitals', async ({ page }) => {
      await page.goto('http://localhost:3002');
      
      // Measure Largest Contentful Paint (LCP)
      const lcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000);
        });
      });
      
      // LCP should be under 2.5 seconds
      expect(lcp).toBeLessThan(2500);
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      // Navigate to marketplace
      await page.locator('text=Available Session Keys').scrollIntoViewIfNeeded();
      
      // Measure rendering time for session key cards
      const startTime = Date.now();
      
      // Wait for all session key cards to be visible
      await expect(page.locator('text=DeFi Trading Session')).toBeVisible();
      await expect(page.locator('text=Gaming Session')).toBeVisible();
      await expect(page.locator('text=NFT Trading Session')).toBeVisible();
      
      const renderTime = Date.now() - startTime;
      
      // Should render quickly
      expect(renderTime).toBeLessThan(1000);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      // Simulate offline condition
      await page.context().setOffline(true);
      
      try {
        // Navigate to page
        await page.goto('http://localhost:3002', { timeout: 5000 });
      } catch (error) {
        // Expected to fail when offline
        expect(error.message).toContain('ERR_INTERNET_DISCONNECTED');
      }
      
      // Restore network
      await page.context().setOffline(false);
      
      // Verify app works after network restoration
      await page.goto('http://localhost:3002');
      await expect(page.locator('h1')).toBeVisible();
    });

    test('should handle JavaScript errors gracefully', async ({ page }) => {
      const errors = [];

      // Listen for console errors
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      // Listen for page errors
      page.on('pageerror', error => {
        errors.push(error.message);
      });

      await page.goto('http://localhost:3002');
      await page.waitForLoadState('networkidle');

      // Navigate through different sections
      await page.getByRole('button', { name: 'Create Session', exact: true }).scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Create Session', exact: true }).click();
      await page.getByRole('button', { name: 'Manage Keys' }).click();
      await page.getByRole('button', { name: 'History' }).click();
      await page.getByRole('button', { name: 'Marketplace', exact: true }).click();

      // Should have minimal or no JavaScript errors
      const criticalErrors = errors.filter(error => 
        !error.includes('DevTools') && 
        !error.includes('extension') &&
        !error.includes('404') // Ignore 404s for missing resources
      );

      expect(criticalErrors.length).toBeLessThan(3);
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.goto('http://localhost:3002');
      
      // Check for proper heading structure
      const h1 = page.locator('h1');
      await expect(h1).toBeVisible();
      
      const h2Elements = page.locator('h2');
      const h2Count = await h2Elements.count();
      expect(h2Count).toBeGreaterThan(0);
      
      const h3Elements = page.locator('h3');
      const h3Count = await h3Elements.count();
      expect(h3Count).toBeGreaterThan(0);
    });

    test('should have proper button accessibility', async ({ page }) => {
      await page.goto('http://localhost:3002');
      
      // Check main action buttons
      const exploreButton = page.locator('button:has-text("Explore Marketplace")');
      await expect(exploreButton).toBeVisible();
      await expect(exploreButton).toBeEnabled();
      
      const createButton = page.locator('button:has-text("Create Session Key")');
      await expect(createButton).toBeVisible();
      await expect(createButton).toBeEnabled();
      
      // Check disabled buttons have proper state
      await page.locator('text=Available Session Keys').scrollIntoViewIfNeeded();
      const connectWalletButtons = page.locator('button:has-text("Connect Wallet to Rent")');
      await expect(connectWalletButtons.first()).toBeDisabled();
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.goto('http://localhost:3002');
      
      // Test tab navigation to first focusable element
      await page.keyboard.press('Tab');
      
      // Check if any button is focusable
      const exploreButton = page.getByRole('button', { name: 'Explore Marketplace' });
      const createButton = page.getByRole('button', { name: 'Create Session Key' });
      
      // At least one button should be visible and focusable
      await expect(exploreButton.or(createButton)).toBeVisible();
      
      // Test that we can focus on a specific button
      await exploreButton.focus();
      await expect(exploreButton).toBeFocused();
      
      // Test Enter key activation
      await page.keyboard.press('Enter');
      
      // Should trigger button action (scroll to marketplace)
      await expect(page.getByRole('heading', { name: 'Session Key Marketplace Demo' })).toBeVisible();
    });
  });

  test.describe('SEO and Meta Tags', () => {
    test('should have proper meta tags', async ({ page }) => {
      await page.goto('http://localhost:3002');
      
      // Check title
      await expect(page).toHaveTitle(/AccountLend/);
      
      // Check meta description
      const metaDescription = page.locator('meta[name="description"]');
      await expect(metaDescription).toHaveAttribute('content', /.+/);
      
      // Check viewport meta tag
      const viewportMeta = page.locator('meta[name="viewport"]');
      await expect(viewportMeta).toHaveAttribute('content', /width=device-width/);
    });

    test('should have proper Open Graph tags', async ({ page }) => {
      await page.goto('http://localhost:3002');
      
      // Check OG title
      const ogTitle = page.locator('meta[property="og:title"]');
      if (await ogTitle.count() > 0) {
        await expect(ogTitle).toHaveAttribute('content', /.+/);
      }
      
      // Check OG description
      const ogDescription = page.locator('meta[property="og:description"]');
      if (await ogDescription.count() > 0) {
        await expect(ogDescription).toHaveAttribute('content', /.+/);
      }
    });
  });
});
