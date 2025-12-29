# Playwright ARIA Snapshot Testing

Automated ARIA snapshot testing system for Essential Blocks demo pages using Playwright.

## 📋 Overview

This project creates and manages ARIA snapshots for all URLs listed in `Public_urls.txt`. It provides three main functions:

1. **Create/Update Single Snapshot** - Create or update snapshot for a specific URL
2. **Update All Snapshots** - Batch update all snapshots from `Public_urls.txt`
3. **Update Specific Snapshots** - Update snapshots matching a pattern

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install:browsers
```

### Usage

#### 1. Update All Snapshots (Parallel)

Update snapshots for all URLs in `Public_urls.txt` using 5 parallel threads:

```bash
npm run snapshot:all
```

Or with custom concurrency:

```bash
MAX_CONCURRENT=10 npm run snapshot:all
```

Or:

```bash
node create-snapshots.js --all
```

**Expected Output:**
```
🚀 Starting batch snapshot update...
📋 Found 80 URLs to process
⚡ Concurrency: 5 parallel threads

[1/80] (1.3%) - ✅ https://essential-blocks.com/demo/accordion/
[2/80] (2.5%) - ✅ https://essential-blocks.com/demo/advanced-heading/
...

============================================================
📊 SUMMARY
============================================================
✅ Successful: 80
❌ Failed: 0
📁 Total: 80
⏱️  Duration: 45.32s
🚀 Speed: 1.77 snapshots/sec

📄 SQA Report generated: test-results/snapshot-report-2025-12-29T09-19-42-123Z.json
```

#### 2. Create/Update Single URL Snapshot

Create or update snapshot for a specific URL:

```bash
node create-snapshots.js --create https://essential-blocks.com/demo/accordion/
```

#### 3. Update Specific Snapshots by Pattern

Update snapshots for URLs matching a pattern:

```bash
# Update all "accordion" related snapshots
node create-snapshots.js --update accordion

# Update all "advanced" related snapshots
node create-snapshots.js --update advanced

# Update specific demo
node create-snapshots.js --update "advanced-heading"
```

## 📁 Project Structure

```
E2E/
├── Public_urls.txt           # List of URLs to snapshot
├── snapshot_latest/          # Generated snapshots stored here
│   ├── demo-accordion.snapshot.txt
│   ├── demo-advanced-heading.snapshot.txt
│   └── ...
├── create-snapshots.js       # Main snapshot script
├── package.json              # Project dependencies
├── playwright.config.js      # Playwright configuration
└── README.md                 # This file
```

## 🔧 How It Works

### Snapshot Creation Process

1. **Read URLs**: Script reads URLs from `Public_urls.txt`
2. **Parallel Processing**: Launches 5 concurrent browser instances
3. **Navigate**: Each browser navigates to a URL
4. **Wait for Content**: Waits for page to fully load (load event + 3s delay)
5. **Capture ARIA Snapshot**: Uses Playwright's `ariaSnapshot()` API
6. **Save to File**: Saves snapshot to `snapshot_latest/` directory
7. **Generate Report**: Creates JSON report in `test-results/` directory

### Filename Convention

Snapshots are automatically named based on the URL path:

- `https://essential-blocks.com/demo/accordion/` → `demo-accordion.snapshot.txt`
- `https://essential-blocks.com/demo/advanced-heading/` → `demo-advanced-heading.snapshot.txt`

---

## ⚡ Performance Tuning

### Adjusting Concurrency

**Default**: 5 parallel threads

**Increase for faster processing** (if you have good network/CPU):
```bash
MAX_CONCURRENT=10 npm run snapshot:all
```

**Decrease if experiencing timeouts**:
```bash
MAX_CONCURRENT=3 npm run snapshot:all
```

### Performance Comparison

| Threads | 80 URLs Duration | Speed | Best For |
|---------|------------------|-------|----------|
| 1 (Sequential) | ~4 minutes | 0.33/sec | Slow networks |
| 3 | ~90 seconds | 0.89/sec | Conservative |
| 5 (Default) | ~45 seconds | 1.77/sec | Balanced |
| 10 | ~30 seconds | 2.67/sec | Fast networks |

---

## 📊 SQA Reporting

### JSON Report Structure

After each run, a detailed JSON report is generated:

**Location**: `test-results/snapshot-report-[timestamp].json`

**Contents**:
```json
{
  "timestamp": "2025-12-29T09:19:42.123Z",
  "totalUrls": 80,
  "successfulSnapshots": 78,
  "failedSnapshots": 2,
  "durationSeconds": 45.32,
  "speedSnapshotsPerSecond": "1.77",
  "failedUrls": [...],
  "successfulUrls": [...]
}
```

### GitHub Actions Reports

- **PR Comments**: Automatic summary on pull requests
- **Job Summaries**: Detailed results in Actions tab
- **Artifacts**: Downloadable JSON reports

See [SQA-GUIDE.md](file:///Users/ismail/Desktop/E2E/SQA-GUIDE.md) for detailed reporting documentation.

## 🧪 Testing Snapshots

Once snapshots are created, you can use them in Playwright tests:

```javascript
// Example test file: tests/snapshot.spec.js
const { test, expect } = require('@playwright/test');

test('accordion page matches snapshot', async ({ page }) => {
  await page.goto('https://essential-blocks.com/demo/accordion/');
  await expect(page.locator('body')).toMatchAriaSnapshot();
});
```

## 🔄 GitHub Actions Integration

### Workflow Example

Create `.github/workflows/snapshot-test.yml`:

```yaml
name: Snapshot Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        
    - name: Install dependencies
      run: npm install
      
    - name: Install Playwright browsers
      run: npx playwright install --with-deps chromium
      
    - name: Run snapshot tests
      run: npm test
      
    - name: Upload test results
      if: failure()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: playwright-report/
```

### Update Snapshots in CI

To update snapshots via GitHub Actions:

```yaml
- name: Update all snapshots
  run: npm run snapshot:all
  
- name: Commit updated snapshots
  run: |
    git config --local user.email "action@github.com"
    git config --local user.name "GitHub Action"
    git add snapshot_latest/
    git commit -m "Update snapshots" || echo "No changes to commit"
    git push
```

## 📊 Output Examples

### Successful Run

```
🚀 Starting batch snapshot update...

📋 Found 80 URLs to process

[1/80] Processing: https://essential-blocks.com/demo/accordion/
📸 Creating snapshot for: https://essential-blocks.com/demo/accordion/
✅ Snapshot saved: demo-accordion.snapshot.txt

[2/80] Processing: https://essential-blocks.com/demo/advanced-heading/
📸 Creating snapshot for: https://essential-blocks.com/demo/advanced-heading/
✅ Snapshot saved: demo-advanced-heading.snapshot.txt

...

============================================================
📊 SUMMARY
============================================================
✅ Successful: 80
❌ Failed: 0
📁 Total: 80
```

## 🛠️ Troubleshooting

### Issue: "Cannot find module 'playwright'"

**Solution**: Run `npm install`

### Issue: "Browser not found"

**Solution**: Run `npm run install:browsers`

### Issue: Timeout errors

**Solution**: Increase timeout in `create-snapshots.js`:

```javascript
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 }); // 2 minutes
```

### Issue: Snapshots differ on each run

**Solution**: Some pages have dynamic content. You may need to:
- Increase wait time after page load
- Hide dynamic elements before taking snapshot
- Use `waitForSelector` for specific elements

## 📝 Managing URLs

Edit `Public_urls.txt` to add/remove URLs:

```txt
https://essential-blocks.com/demo/accordion/
https://essential-blocks.com/demo/advanced-heading/
# This is a comment - lines starting with # are ignored
https://essential-blocks.com/demo/button/
```

## 🔍 Advanced Usage

### Custom Filename

```javascript
const { createOrUpdateSnapshot } = require('./create-snapshots.js');

await createOrUpdateSnapshot(
  'https://essential-blocks.com/demo/accordion/',
  'my-custom-name.snapshot.txt'
);
```

### Programmatic Usage

```javascript
const { updateAllSnapshots, updateSpecificSnapshot } = require('./create-snapshots.js');

// Update all
const results = await updateAllSnapshots();
console.log(`Success: ${results.success.length}, Failed: ${results.failed.length}`);

// Update specific
const specificResults = await updateSpecificSnapshot('accordion');
```

## 📚 Resources

- [Playwright ARIA Snapshots Documentation](https://playwright.dev/docs/aria-snapshots)
- [Playwright Test Documentation](https://playwright.dev/docs/intro)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 📄 License

MIT
