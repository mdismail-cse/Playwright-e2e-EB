# 📸 Snapshot Test Report - SQA Guide

## Understanding the Reports

### JSON Report Structure

After running snapshots, a JSON report is generated in `test-results/` directory:

```json
{
  "timestamp": "2025-12-29T09:19:42.123Z",
  "totalUrls": 80,
  "successfulSnapshots": 78,
  "failedSnapshots": 2,
  "durationSeconds": 45.32,
  "speedSnapshotsPerSecond": "1.77",
  "failedUrls": [
    {
      "url": "https://example.com/page1",
      "error": "Timeout 90000ms exceeded"
    }
  ],
  "successfulUrls": [
    {
      "url": "https://example.com/page2",
      "filename": "demo-page2.snapshot.txt"
    }
  ]
}
```

### Key Metrics

| Metric | Description | Good Value |
|--------|-------------|------------|
| **Success Rate** | Percentage of successful snapshots | > 95% |
| **Duration** | Total time to create all snapshots | < 2 minutes (with 5 threads) |
| **Speed** | Snapshots per second | > 1.5 snapshots/sec |
| **Failed Count** | Number of failed snapshots | 0 |

---

## GitHub Actions Report

### Where to Find Reports

1. **GitHub Actions Summary** - Click on any workflow run
2. **PR Comments** - Automatic comment on pull requests
3. **Artifacts** - Download `snapshot-reports` artifact for JSON files

### Sample GitHub Actions Summary

```
📸 Snapshot Test Results

📊 Summary
┌─────────────────┬────────┐
│ Metric          │ Value  │
├─────────────────┼────────┤
│ ✅ Successful   │ 78     │
│ ❌ Failed       │ 2      │
│ 📁 Total URLs   │ 80     │
│ ⏱️ Duration     │ 45.3s  │
│ 📈 Success Rate │ 97.5%  │
└─────────────────┴────────┘

❌ Failed URLs
- https://essential-blocks.com/demo/page1/
  - Error: Timeout 90000ms exceeded
```

---

## Parallel Execution

### How It Works

- **Default Threads**: 5 concurrent snapshots
- **Configurable**: Set `MAX_CONCURRENT` environment variable
- **Speed Improvement**: ~5x faster than sequential

### Example Performance

| Mode | URLs | Duration | Speed |
|------|------|----------|-------|
| Sequential | 80 | ~4 minutes | 0.33/sec |
| Parallel (5) | 80 | ~45 seconds | 1.77/sec |
| Parallel (10) | 80 | ~30 seconds | 2.67/sec |

### Adjusting Concurrency

**Local:**
```bash
MAX_CONCURRENT=10 npm run snapshot:all
```

**GitHub Actions:**
```yaml
env:
  MAX_CONCURRENT: 10
```

---

## SQA Testing Workflow

### 1. Initial Snapshot Creation
```bash
npm run snapshot:all
```
- Creates baseline snapshots for all URLs
- Review JSON report for any failures
- Commit snapshots to repository

### 2. Continuous Testing
- GitHub Actions runs automatically on push/PR
- Compares current pages against snapshots
- Reports any differences

### 3. Updating Snapshots
When content changes intentionally:
```bash
# Update specific page
node create-snapshots.js --update accordion

# Update all pages
npm run snapshot:all
```

### 4. Reviewing Failures

**Common Failure Reasons:**
1. **Timeout** - Page takes too long to load
2. **Network Error** - Page unavailable
3. **Content Changed** - Intentional or unintentional changes

**Action Steps:**
1. Check the failed URL manually
2. If content is correct, update snapshot
3. If content is wrong, file a bug

---

## Reading GitHub Actions Output

### Console Output
```
🚀 Starting batch snapshot update...

📋 Found 80 URLs to process
⚡ Concurrency: 5 parallel threads

[1/80] (1.3%) - ✅ https://essential-blocks.com/demo/accordion/
[2/80] (2.5%) - ✅ https://essential-blocks.com/demo/advanced-heading/
[3/80] (3.8%) - ❌ https://essential-blocks.com/demo/broken-page/
...

============================================================
📊 SUMMARY
============================================================
✅ Successful: 78
❌ Failed: 2
📁 Total: 80
⏱️  Duration: 45.32s
🚀 Speed: 1.77 snapshots/sec

❌ Failed URLs:
  - https://essential-blocks.com/demo/broken-page/
    Error: Timeout 90000ms exceeded
```

### PR Comment
Automatically posted on pull requests with:
- Summary table
- Success rate
- List of failed URLs (if any)
- Performance metrics

---

## Best Practices for SQA

### ✅ Do's
- Review JSON reports after each run
- Investigate all failures
- Update snapshots when content changes intentionally
- Monitor success rate trends
- Use parallel execution for faster feedback

### ❌ Don'ts
- Ignore failed snapshots
- Update snapshots without reviewing changes
- Run too many parallel threads (causes timeouts)
- Commit without checking the report

---

## Troubleshooting

### High Failure Rate
**Cause**: Network issues, slow pages, or actual bugs
**Solution**: 
1. Check network connectivity
2. Increase timeout in script
3. Reduce parallel threads

### Slow Performance
**Cause**: Too few parallel threads
**Solution**: Increase `MAX_CONCURRENT` to 8-10

### Timeouts
**Cause**: Too many parallel threads or slow pages
**Solution**: 
1. Reduce `MAX_CONCURRENT` to 3-5
2. Increase timeout in `create-snapshots.js`

---

## Report Retention

| Report Type | Location | Retention |
|-------------|----------|-----------|
| JSON Reports | `test-results/` | 30 days (GitHub) |
| Playwright HTML | `playwright-report/` | 30 days (GitHub) |
| Test Videos | `test-results/` | 7 days (GitHub) |
| Snapshots | `snapshot_latest/` | Permanent (Git) |

---

## Questions?

Common SQA questions answered:

**Q: How do I know if a test failed?**
A: Check the GitHub Actions summary or JSON report for failed count > 0

**Q: What does "Success Rate" mean?**
A: Percentage of URLs that successfully created snapshots

**Q: Should I update snapshots for every failure?**
A: No! Only update if the content change is intentional

**Q: How fast should snapshot creation be?**
A: With 5 threads, expect 1.5-2 snapshots/second

**Q: Can I run tests locally?**
A: Yes! Use `npm run snapshot:all` or `npm test`
