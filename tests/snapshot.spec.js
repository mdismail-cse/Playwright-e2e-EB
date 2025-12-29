const { test, expect } = require('@playwright/test');
const fs = require('fs').promises;
const path = require('path');

/**
 * Example Playwright test that uses ARIA snapshots
 * This demonstrates how to use the snapshots created by create-snapshots.js
 */

// Read snapshot file
async function readSnapshot(filename) {
    const snapshotPath = path.join(__dirname, '..', 'snapshot_latest', filename);
    return await fs.readFile(snapshotPath, 'utf-8');
}

test.describe('Essential Blocks Demo Pages - ARIA Snapshot Tests', () => {

    test('accordion page matches ARIA snapshot', async ({ page }) => {
        await page.goto('https://essential-blocks.com/demo/accordion/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000); // Wait for dynamic content

        // This will compare against the snapshot file
        await expect(page.locator('body')).toMatchAriaSnapshot();
    });

    test('advanced-heading page matches ARIA snapshot', async ({ page }) => {
        await page.goto('https://essential-blocks.com/demo/advanced-heading/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await expect(page.locator('body')).toMatchAriaSnapshot();
    });

    test('button page matches ARIA snapshot', async ({ page }) => {
        await page.goto('https://essential-blocks.com/demo/button/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        await expect(page.locator('body')).toMatchAriaSnapshot();
    });

    // Add more tests for other pages as needed
    // You can generate these programmatically from Public_urls.txt
});

/**
 * To run these tests:
 * 
 * 1. First create snapshots:
 *    npm run snapshot:all
 * 
 * 2. Then run tests:
 *    npm test
 * 
 * 3. To update snapshots when content changes:
 *    npm run snapshot:all
 * 
 * 4. To update specific snapshot:
 *    node create-snapshots.js --update accordion
 */
