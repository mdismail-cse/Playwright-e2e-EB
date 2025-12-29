#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

/**
 * Generate HTML report from validation JSON
 */
async function generateValidationHTMLReport(reportData) {
    const totalIssues = reportData.failedValidations + reportData.missingSnapshots + reportData.errors;
    const statusClass = totalIssues === 0 ? 'success' : 'failed';

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Snapshot Validation Report</title>
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
    .header.success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    .header.failed {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    .header h1 { font-size: 32px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .success-color { color: #10b981; }
    .failed-color { color: #ef4444; }
    .warning-color { color: #f59e0b; }
    .neutral-color { color: #6366f1; }
    .results {
      padding: 30px;
    }
    .results h2 {
      margin-bottom: 20px;
      color: #333;
    }
    .section {
      margin-bottom: 30px;
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
    .status-missing {
      background: #fef3c7;
      color: #92400e;
    }
    .status-error {
      background: #fee2e2;
      color: #991b1b;
    }
    .error-msg {
      color: #dc2626;
      font-size: 13px;
      margin-top: 4px;
    }
    .details {
      color: #6b7280;
      font-size: 12px;
      margin-top: 4px;
    }
    .timestamp {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 14px;
      border-top: 1px solid #e5e7eb;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-left: 8px;
    }
    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }
    .badge-failed {
      background: #fee2e2;
      color: #991b1b;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header ${statusClass}">
      <h1>🧪 Snapshot Validation Report</h1>
      <p>${totalIssues === 0 ? '✅ All snapshots validated successfully!' : `⚠️ ${totalIssues} issue(s) found`}</p>
    </div>
    
    <div class="summary">
      <div class="metric">
        <div class="metric-value success-color">${reportData.passedValidations}</div>
        <div class="metric-label">✅ Passed</div>
      </div>
      <div class="metric">
        <div class="metric-value failed-color">${reportData.failedValidations}</div>
        <div class="metric-label">❌ Failed</div>
      </div>
      <div class="metric">
        <div class="metric-value warning-color">${reportData.missingSnapshots}</div>
        <div class="metric-label">📄 Missing</div>
      </div>
      <div class="metric">
        <div class="metric-value failed-color">${reportData.errors}</div>
        <div class="metric-label">⚠️ Errors</div>
      </div>
      <div class="metric">
        <div class="metric-value neutral-color">${reportData.totalUrls}</div>
        <div class="metric-label">📁 Total</div>
      </div>
      <div class="metric">
        <div class="metric-value neutral-color">${reportData.successRate}%</div>
        <div class="metric-label">📈 Success Rate</div>
      </div>
    </div>
    
    <div class="results">
      ${reportData.passed.length > 0 ? `
      <div class="section">
        <h2>✅ Passed Validations <span class="badge badge-success">${reportData.passed.length}</span></h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>URL</th>
              <th>Status</th>
              <th>Snapshot File</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.passed.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.url}</td>
                <td><span class="status status-pass">PASS</span></td>
                <td>${item.filename}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${reportData.failed.length > 0 ? `
      <div class="section">
        <h2>❌ Failed Validations <span class="badge badge-failed">${reportData.failed.length}</span></h2>
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
            ${reportData.failed.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.url}</td>
                <td><span class="status status-fail">FAIL</span></td>
                <td>
                  <div class="error-msg">❌ ${item.error}</div>
                  ${item.details ? `<div class="details">Expected: ${item.details.expectedLines} lines | Actual: ${item.details.actualLines} lines</div>` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${reportData.missing.length > 0 ? `
      <div class="section">
        <h2>📄 Missing Snapshots <span class="badge badge-failed">${reportData.missing.length}</span></h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>URL</th>
              <th>Status</th>
              <th>Expected File</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.missing.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.url}</td>
                <td><span class="status status-missing">MISSING</span></td>
                <td>${item.filename}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
      
      ${reportData.errors.length > 0 ? `
      <div class="section">
        <h2>⚠️ Errors <span class="badge badge-failed">${reportData.errors.length}</span></h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>URL</th>
              <th>Status</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.errors.map((item, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${item.url}</td>
                <td><span class="status status-error">ERROR</span></td>
                <td><div class="error-msg">⚠️ ${item.error}</div></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}
    </div>
    
    <div class="timestamp">
      Generated: ${new Date(reportData.timestamp).toLocaleString()} | Duration: ${reportData.durationSeconds}s | Speed: ${reportData.speedValidationsPerSecond} validations/sec
    </div>
  </div>
</body>
</html>
  `;

    const reportDir = path.join(__dirname, 'test-results');
    const htmlPath = path.join(reportDir, 'validation-report.html');

    await fs.mkdir(reportDir, { recursive: true });
    await fs.writeFile(htmlPath, html, 'utf-8');

    console.log(`✅ HTML Validation Report: ${htmlPath}`);
}

// Run if called directly
if (require.main === module) {
    const reportDir = path.join(__dirname, 'test-results');
    const files = require('fs').readdirSync(reportDir);
    const jsonFiles = files.filter(f => f.startsWith('validation-report-') && f.endsWith('.json'));

    if (jsonFiles.length === 0) {
        console.log('❌ No validation report found. Run: node validate-snapshots.js');
        process.exit(1);
    }

    const latestReport = jsonFiles.sort().reverse()[0];
    const reportPath = path.join(reportDir, latestReport);
    const reportData = JSON.parse(require('fs').readFileSync(reportPath, 'utf-8'));

    generateValidationHTMLReport(reportData).then(() => {
        console.log('\n✅ HTML report generated successfully!');
    }).catch(console.error);
}

module.exports = { generateValidationHTMLReport };
