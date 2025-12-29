#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Configuration
const PUBLIC_URLS_FILE = path.join(__dirname, 'public_urls.txt');
const SNAPSHOT_DIR = path.join(__dirname, 'snapshot_latest');
const REPORT_DIR = path.join(__dirname, 'test-results');
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '5', 10); // Parallel threads

/**
 * Generate a filename from a URL
 * @param {string} url - The URL to convert
 * @returns {string} - Safe filename
 */
function urlToFilename(url) {
    // Extract the path from URL and create a safe filename
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/^\/|\/$/g, ''); // Remove leading/trailing slashes
    const filename = pathname.replace(/\//g, '-') || 'index';
    return `${filename}.snapshot.txt`;
}

/**
 * Create or update ARIA snapshot for a single URL
 * @param {string} url - The URL to snapshot
 * @param {string|null} customFilename - Optional custom filename
 */
async function createOrUpdateSnapshot(url, customFilename = null) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log(`📸 Creating snapshot for: ${url}`);

        // Navigate to the URL
        await page.goto(url, { waitUntil: 'load', timeout: 180000 });

        // Wait for any dynamic content to load
        await page.waitForTimeout(10000);

        // Get ARIA snapshot
        const snapshot = await page.locator('body').ariaSnapshot();

        // Determine filename
        const filename = customFilename || urlToFilename(url);
        const filepath = path.join(SNAPSHOT_DIR, filename);

        // Ensure snapshot directory exists
        await fs.mkdir(SNAPSHOT_DIR, { recursive: true });

        // Write snapshot to file
        await fs.writeFile(filepath, snapshot, 'utf-8');

        console.log(`✅ Snapshot saved: ${filename}`);
        return { success: true, filename, url };

    } catch (error) {
        console.error(`❌ Error creating snapshot for ${url}:`, error.message);
        return { success: false, url, error: error.message };
    } finally {
        await browser.close();
    }
}

/**
 * Read all URLs from Public_urls.txt
 * @returns {Promise<string[]>} - Array of URLs
 */
async function readUrlsFromFile() {
    try {
        const content = await fs.readFile(PUBLIC_URLS_FILE, 'utf-8');
        const urls = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#')); // Filter empty lines and comments
        return urls;
    } catch (error) {
        console.error(`❌ Error reading ${PUBLIC_URLS_FILE}:`, error.message);
        throw error;
    }
}

/**
 * Process URLs in parallel with concurrency control
 */
async function processInParallel(urls, concurrency = MAX_CONCURRENT) {
    const results = {
        success: [],
        failed: [],
        startTime: new Date().toISOString(),
        endTime: null,
        duration: null
    };

    const startTimestamp = Date.now();
    let completed = 0;

    // Create a pool of workers
    const executeTask = async (url) => {
        const result = await createOrUpdateSnapshot(url);
        completed++;

        const progress = ((completed / urls.length) * 100).toFixed(1);
        console.log(`[${completed}/${urls.length}] (${progress}%) - ${result.success ? '✅' : '❌'} ${url}`);

        if (result.success) {
            results.success.push(result);
        } else {
            results.failed.push(result);
        }

        return result;
    };

    // Process URLs with concurrency limit
    const chunks = [];
    for (let i = 0; i < urls.length; i += concurrency) {
        chunks.push(urls.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
        await Promise.all(chunk.map(executeTask));
    }

    results.endTime = new Date().toISOString();
    results.duration = ((Date.now() - startTimestamp) / 1000).toFixed(2);

    return results;
}

/**
 * Update all snapshots from Public_urls.txt
 */
async function updateAllSnapshots(parallel = true) {
    console.log('🚀 Starting batch snapshot update...\n');

    const urls = await readUrlsFromFile();
    console.log(`📋 Found ${urls.length} URLs to process`);
    console.log(`⚡ Concurrency: ${parallel ? MAX_CONCURRENT + ' parallel threads' : 'Sequential'}\n`);

    let results;

    if (parallel) {
        // Parallel processing
        results = await processInParallel(urls, MAX_CONCURRENT);
    } else {
        // Sequential processing (original behavior)
        results = {
            success: [],
            failed: [],
            startTime: new Date().toISOString(),
            endTime: null,
            duration: null
        };

        const startTimestamp = Date.now();

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            console.log(`[${i + 1}/${urls.length}] Processing: ${url}`);

            const result = await createOrUpdateSnapshot(url);

            if (result.success) {
                results.success.push(result);
            } else {
                results.failed.push(result);
            }

            console.log('');
        }

        results.endTime = new Date().toISOString();
        results.duration = ((Date.now() - startTimestamp) / 1000).toFixed(2);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`📁 Total: ${urls.length}`);
    console.log(`⏱️  Duration: ${results.duration}s`);
    console.log(`🚀 Speed: ${(urls.length / parseFloat(results.duration)).toFixed(2)} snapshots/sec`);

    if (results.failed.length > 0) {
        console.log('\n❌ Failed URLs:');
        results.failed.forEach(({ url, error }) => {
            console.log(`  - ${url}`);
            console.log(`    Error: ${error}`);
        });
    }

    // Generate SQA-friendly report
    await generateReport(results, urls.length);

    return results;
}

/**
 * Generate a JSON report for SQA
 * @param {object} results - The results object from snapshot generation
 * @param {number} totalUrls - Total number of URLs processed
 */
async function generateReport(results, totalUrls) {
    const report = {
        timestamp: new Date().toISOString(),
        totalUrls: totalUrls,
        successfulSnapshots: results.success.length,
        failedSnapshots: results.failed.length,
        durationSeconds: parseFloat(results.duration),
        speedSnapshotsPerSecond: (totalUrls / parseFloat(results.duration)).toFixed(2),
        failedUrls: results.failed.map(item => ({ url: item.url, error: item.error })),
        successfulUrls: results.success.map(item => ({ url: item.url, filename: item.filename }))
    };

    const reportFilename = `snapshot-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const reportFilepath = path.join(REPORT_DIR, reportFilename);

    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(reportFilepath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n📄 SQA Report generated: ${reportFilepath}`);
}

/**
 * Update snapshot for specific URL(s) matching a pattern
 * @param {string} pattern - URL pattern to match (can be exact URL or substring)
 */
async function updateSpecificSnapshot(pattern) {
    console.log(`🔍 Searching for URLs matching: "${pattern}"\n`);

    const urls = await readUrlsFromFile();

    // Find matching URLs
    const matchingUrls = urls.filter(url => {
        // Try exact match first
        if (url === pattern) return true;

        // Try substring match
        if (url.includes(pattern)) return true;

        // Try regex match (if pattern looks like a regex)
        try {
            const regex = new RegExp(pattern, 'i');
            return regex.test(url);
        } catch {
            return false;
        }
    });

    if (matchingUrls.length === 0) {
        console.log(`❌ No URLs found matching: "${pattern}"`);
        console.log('\n💡 Tip: Try using a substring like "accordion" or "advanced-heading"');
        return { success: [], failed: [] };
    }

    console.log(`✅ Found ${matchingUrls.length} matching URL(s):\n`);
    matchingUrls.forEach((url, i) => {
        console.log(`  ${i + 1}. ${url}`);
    });
    console.log('');

    const results = {
        success: [],
        failed: []
    };

    // Process matching URLs
    for (let i = 0; i < matchingUrls.length; i++) {
        const url = matchingUrls[i];
        console.log(`[${i + 1}/${matchingUrls.length}] Processing: ${url}`);

        const result = await createOrUpdateSnapshot(url);

        if (result.success) {
            results.success.push(result);
        } else {
            results.failed.push(result);
        }

        console.log('');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successful: ${results.success.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);

    return results;
}

/**
 * CLI Interface
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
📸 Playwright ARIA Snapshot Creator
=====================================

Usage:
  node create-snapshots.js [options]

Options:
  --all                    Update all snapshots from Public_urls.txt
  --create <url>          Create/update snapshot for a specific URL
  --update <pattern>      Update snapshot(s) matching a pattern
  --help, -h              Show this help message

Examples:
  # Update all snapshots
  npm run snapshot:all
  
  # Create snapshot for a specific URL
  node create-snapshots.js --create https://essential-blocks.com/demo/accordion/
  
  # Update snapshots matching "accordion"
  node create-snapshots.js --update accordion
  
  # Update snapshots matching "advanced"
  node create-snapshots.js --update advanced
    `);
        return;
    }

    try {
        if (args.includes('--all')) {
            await updateAllSnapshots();
        } else if (args.includes('--create')) {
            const urlIndex = args.indexOf('--create') + 1;
            const url = args[urlIndex];

            if (!url) {
                console.error('❌ Error: Please provide a URL with --create');
                process.exit(1);
            }

            await createOrUpdateSnapshot(url);
        } else if (args.includes('--update')) {
            const patternIndex = args.indexOf('--update') + 1;
            const pattern = args[patternIndex];

            if (!pattern) {
                console.error('❌ Error: Please provide a pattern with --update');
                process.exit(1);
            }

            await updateSpecificSnapshot(pattern);
        } else {
            console.error('❌ Error: Unknown option. Use --help for usage information.');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

// Export functions for use in other scripts or tests
module.exports = {
    createOrUpdateSnapshot,
    updateAllSnapshots,
    updateSpecificSnapshot,
    urlToFilename
};
