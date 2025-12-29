#!/usr/bin/env node

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const PUBLIC_URLS_FILE = path.join(__dirname, 'public_urls.txt');
const SNAPSHOT_DIR = path.join(__dirname, 'snapshot_latest');
const REPORT_DIR = path.join(__dirname, 'test-results');
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT || '5', 10);

/**
 * Generate a filename from a URL
 */
function urlToFilename(url) {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname.replace(/^\/|\/$/g, '');
    const filename = pathname.replace(/\//g, '-') || 'index';
    return `${filename}.snapshot.txt`;
}

/**
 * Read all URLs from public_urls.txt
 */
async function readUrlsFromFile() {
    try {
        const content = await fs.readFile(PUBLIC_URLS_FILE, 'utf-8');
        const urls = content
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'));
        return urls;
    } catch (error) {
        console.error(`❌ Error reading ${PUBLIC_URLS_FILE}:`, error.message);
        throw error;
    }
}

/**
 * Validate a single URL against its stored snapshot
 */
async function validateSnapshot(url) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log(`🔍 Validating: ${url}`);

        // Get expected snapshot filename
        const filename = urlToFilename(url);
        const snapshotPath = path.join(SNAPSHOT_DIR, filename);

        // Check if snapshot exists
        try {
            await fs.access(snapshotPath);
        } catch {
            return {
                success: false,
                url,
                filename,
                error: 'Snapshot file not found',
                status: 'MISSING'
            };
        }

        // Read stored snapshot
        const storedSnapshot = await fs.readFile(snapshotPath, 'utf-8');

        // Navigate to URL and get current snapshot
        await page.goto(url, { waitUntil: 'load', timeout: 180000 });
        await page.waitForTimeout(10000);

        // Get ARIA snapshot of main content area (excludes header with countdown timer)
        const contentElement = await page.locator('.eb-fullwidth-container').first();
        const currentSnapshot = await contentElement.ariaSnapshot();

        // Normalize function to handle whitespace and minor differences
        const normalize = (text) => {
            return text
                .trim()
                .replace(/\s+/g, ' ')  // Replace multiple spaces with single space
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .join('\n');
        };

        const normalizedStored = normalize(storedSnapshot);
        const normalizedCurrent = normalize(currentSnapshot);

        // Calculate similarity
        const similarity = calculateSimilarity(normalizedStored, normalizedCurrent);

        // Consider it a match if similarity is >= 95% (allows for minor dynamic content)
        const SIMILARITY_THRESHOLD = 95;
        const isMatch = similarity >= SIMILARITY_THRESHOLD;

        if (isMatch) {
            return {
                success: true,
                url,
                filename,
                status: 'PASS',
                similarity: similarity.toFixed(2)
            };
        } else {
            // Calculate difference
            const diff = calculateDifference(storedSnapshot, currentSnapshot);
            return {
                success: false,
                url,
                filename,
                error: `Snapshot mismatch (${similarity.toFixed(2)}% similar, threshold: ${SIMILARITY_THRESHOLD}%)`,
                status: 'FAIL',
                details: {
                    expectedLines: diff.expectedLines,
                    actualLines: diff.actualLines,
                    similarity: similarity.toFixed(2),
                    threshold: SIMILARITY_THRESHOLD
                }
            };
        }

    } catch (error) {
        return {
            success: false,
            url,
            filename: urlToFilename(url),
            error: error.message,
            status: 'ERROR'
        };
    } finally {
        await browser.close();
    }
}

/**
 * Calculate difference between two snapshots
 */
function calculateDifference(expected, actual) {
    const expectedLines = expected.split('\n').length;
    const actualLines = actual.split('\n').length;
    const maxLines = Math.max(expectedLines, actualLines);
    const lineDiff = Math.abs(expectedLines - actualLines);
    const percentage = ((lineDiff / maxLines) * 100).toFixed(2);

    return {
        expectedLines,
        actualLines,
        percentage
    };
}

/**
 * Calculate similarity percentage between two texts
 */
function calculateSimilarity(text1, text2) {
    const lines1 = text1.split('\n');
    const lines2 = text2.split('\n');

    const maxLength = Math.max(lines1.length, lines2.length);
    if (maxLength === 0) return 100;

    let matchingLines = 0;
    const minLength = Math.min(lines1.length, lines2.length);

    for (let i = 0; i < minLength; i++) {
        if (lines1[i] === lines2[i]) {
            matchingLines++;
        }
    }

    return (matchingLines / maxLength) * 100;
}

/**
 * Process URLs in parallel
 */
async function processInParallel(urls, concurrency = MAX_CONCURRENT) {
    const results = {
        passed: [],
        failed: [],
        missing: [],
        errors: [],
        startTime: new Date().toISOString(),
        endTime: null,
        duration: null
    };

    const startTimestamp = Date.now();
    let completed = 0;

    const executeTask = async (url) => {
        const result = await validateSnapshot(url);
        completed++;

        const progress = ((completed / urls.length) * 100).toFixed(1);
        const statusIcon = result.success ? '✅' : '❌';
        console.log(`[${completed}/${urls.length}] (${progress}%) - ${statusIcon} ${result.status} - ${url}`);

        if (result.status === 'PASS') {
            results.passed.push(result);
        } else if (result.status === 'MISSING') {
            results.missing.push(result);
        } else if (result.status === 'FAIL') {
            results.failed.push(result);
        } else {
            results.errors.push(result);
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
 * Validate all snapshots
 */
async function validateAllSnapshots() {
    console.log('🧪 Starting Snapshot Validation...\n');

    const urls = await readUrlsFromFile();
    console.log(`📋 Found ${urls.length} URLs to validate`);
    console.log(`⚡ Concurrency: ${MAX_CONCURRENT} parallel threads\n`);

    const results = await processInParallel(urls, MAX_CONCURRENT);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${results.passed.length}`);
    console.log(`❌ Failed: ${results.failed.length}`);
    console.log(`📄 Missing: ${results.missing.length}`);
    console.log(`⚠️  Errors: ${results.errors.length}`);
    console.log(`📁 Total: ${urls.length}`);
    console.log(`⏱️  Duration: ${results.duration}s`);
    console.log(`🚀 Speed: ${(urls.length / parseFloat(results.duration)).toFixed(2)} validations/sec`);

    const totalIssues = results.failed.length + results.missing.length + results.errors.length;
    const successRate = ((results.passed.length / urls.length) * 100).toFixed(2);
    console.log(`📈 Success Rate: ${successRate}%`);

    if (totalIssues > 0) {
        console.log('\n⚠️  Issues Found:');

        if (results.missing.length > 0) {
            console.log(`\n📄 Missing Snapshots (${results.missing.length}):`);
            results.missing.forEach(({ url, filename }) => {
                console.log(`  - ${url}`);
                console.log(`    File: ${filename}`);
            });
        }

        if (results.failed.length > 0) {
            console.log(`\n❌ Failed Validations (${results.failed.length}):`);
            results.failed.forEach(({ url, error, details }) => {
                console.log(`  - ${url}`);
                console.log(`    Error: ${error}`);
                if (details) {
                    console.log(`    Expected: ${details.expectedLines} lines, Got: ${details.actualLines} lines`);
                }
            });
        }

        if (results.errors.length > 0) {
            console.log(`\n⚠️  Errors (${results.errors.length}):`);
            results.errors.forEach(({ url, error }) => {
                console.log(`  - ${url}`);
                console.log(`    Error: ${error}`);
            });
        }
    }

    // Generate report
    await generateReport(results, urls.length);

    // Exit with error code if any validations failed
    if (totalIssues > 0) {
        process.exit(1);
    }

    return results;
}

/**
 * Generate JSON report
 */
async function generateReport(results, totalUrls) {
    const report = {
        timestamp: new Date().toISOString(),
        totalUrls: totalUrls,
        passedValidations: results.passed.length,
        failedValidations: results.failed.length,
        missingSnapshots: results.missing.length,
        errors: results.errors.length,
        durationSeconds: parseFloat(results.duration),
        successRate: ((results.passed.length / totalUrls) * 100).toFixed(2),
        speedValidationsPerSecond: (totalUrls / parseFloat(results.duration)).toFixed(2),

        passed: results.passed.map(item => ({
            url: item.url,
            filename: item.filename,
            status: item.status
        })),

        failed: results.failed.map(item => ({
            url: item.url,
            filename: item.filename,
            error: item.error,
            status: item.status,
            details: item.details
        })),

        missing: results.missing.map(item => ({
            url: item.url,
            filename: item.filename,
            error: item.error,
            status: item.status
        })),

        errors: results.errors.map(item => ({
            url: item.url,
            filename: item.filename,
            error: item.error,
            status: item.status
        }))
    };

    const reportFilename = `validation-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const reportFilepath = path.join(REPORT_DIR, reportFilename);

    await fs.mkdir(REPORT_DIR, { recursive: true });
    await fs.writeFile(reportFilepath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n📄 Validation Report: ${reportFilepath}`);

    // Generate HTML report
    try {
        const { generateValidationHTMLReport } = require('./generate-validation-html-report.js');
        await generateValidationHTMLReport(report);
    } catch (error) {
        console.log('⚠️  HTML report generation skipped');
    }
}

// Run if called directly
if (require.main === module) {
    validateAllSnapshots().catch(error => {
        console.error('❌ Fatal error:', error.message);
        process.exit(1);
    });
}

module.exports = {
    validateSnapshot,
    validateAllSnapshots
};
