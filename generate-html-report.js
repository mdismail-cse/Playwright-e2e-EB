#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Generate a simple HTML report from JSON
 */
async function generateHTMLReport() {
    const reportDir = path.join(__dirname, 'test-results');

    // Find the latest JSON report
    const files = await fs.readdir(reportDir);
    const jsonFiles = files.filter(f => f.startsWith('snapshot-report-') && f.endsWith('.json'));

    if (jsonFiles.length === 0) {
        console.log('❌ No report found. Run snapshots first: npm run snapshot:all');
        return;
    }

    const latestReport = jsonFiles.sort().reverse()[0];
    const reportPath = path.join(reportDir, latestReport);

    // Read the JSON report
    const reportData = JSON.parse(await fs.readFile(reportPath, 'utf-8'));

    // Generate HTML
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Snapshot Test Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #fafafa;
    }
    .metric {
      background: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .metric-value {
      font-size: 36px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .metric-label {
      color: #666;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .success { color: #10b981; }
    .failed { color: #ef4444; }
    .neutral { color: #6366f1; }
    .results {
      padding: 30px;
    }
    .results h2 {
      margin-bottom: 20px;
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th {
      background: #f9fafb;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:hover {
      background: #f9fafb;
    }
    .status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-pass {
      background: #d1fae5;
      color: #065f46;
    }
    .status-fail {
      background: #fee2e2;
      color: #991b1b;
    }
    .error-msg {
      color: #dc2626;
      font-size: 13px;
      margin-top: 4px;
    }
    .timestamp {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📸 Snapshot Test Report</h1>
      <p>ARIA Snapshot Testing Results</p>
    </div>
    
    <div class="summary">
      <div class="metric">
        <div class="metric-value success">${reportData.successfulSnapshots}</div>
        <div class="metric-label">✅ Passed</div>
      </div>
      <div class="metric">
        <div class="metric-value failed">${reportData.failedSnapshots}</div>
        <div class="metric-label">❌ Failed</div>
      </div>
      <div class="metric">
        <div class="metric-value neutral">${reportData.totalUrls}</div>
        <div class="metric-label">📁 Total URLs</div>
      </div>
      <div class="metric">
        <div class="metric-value neutral">${reportData.durationSeconds}s</div>
        <div class="metric-label">⏱️ Duration</div>
      </div>
      <div class="metric">
        <div class="metric-value neutral">${((reportData.successfulSnapshots / reportData.totalUrls) * 100).toFixed(1)}%</div>
        <div class="metric-label">📈 Success Rate</div>
      </div>
    </div>
    
    <div class="results">
      <h2>📋 Test Results</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>URL</th>
            <th>Status</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          ${reportData.successfulUrls.map((item, index) => `
            <tr>
              <td>${index + 1}</td>
              <td>${item.url}</td>
              <td><span class="status status-pass">PASS</span></td>
              <td>${item.filename}</td>
            </tr>
          `).join('')}
          ${reportData.failedUrls.map((item, index) => `
            <tr>
              <td>${reportData.successfulUrls.length + index + 1}</td>
              <td>${item.url}</td>
              <td><span class="status status-fail">FAIL</span></td>
              <td>
                <div class="error-msg">❌ ${item.error}</div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="timestamp">
      Generated: ${new Date(reportData.timestamp).toLocaleString()}
    </div>
  </div>
</body>
</html>
  `;

    // Save HTML report
    const htmlPath = path.join(reportDir, 'snapshot-report.html');
    await fs.writeFile(htmlPath, html, 'utf-8');

    console.log(`\n✅ HTML Report generated: ${htmlPath}`);
    console.log(`📊 Open in browser to view results\n`);
}

// Run if called directly
if (require.main === module) {
    generateHTMLReport().catch(console.error);
}

module.exports = { generateHTMLReport };
