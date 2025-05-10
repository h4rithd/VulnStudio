
interface Project {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  preparer: string;
  reviewer: string;
  status: string;
  version: string;
  version_history?: string;
  scope?: any[];
  created_at: string;
}

interface Vulnerability {
  id: string;
  title: string;
  severity: string;
  cvss_score: number;
  background: string;
  details: string;
  remediation: string;
  description?: string;
  vulnerability_id?: string;
  ref_links?: string[];
  request_response?: any;
  affected_versions?: any[];
  display_order?: number;
  poc_images?: Array<{
    name: string;
    data: string;
    content_type: string;
  }>;
  current_status?: boolean;
  retest_date?: string;
  retest_result?: string;
  retest_images?: Array<{
    name: string;
    data: string;
    content_type: string;
  }>;
}

// Define severity order for sorting
const SEVERITY_ORDER: Record<string, number> = {
  'critical': 1,
  'high': 2,
  'medium': 3,
  'low': 4,
  'info': 5
};

export class ReportGenerator {
  private project: Project;
  private vulnerabilities: Vulnerability[];
  
  constructor(project: Project, vulnerabilities: Vulnerability[]) {
    this.project = project;
    // Sort vulnerabilities by severity
    this.vulnerabilities = this.sortVulnerabilities(vulnerabilities);
  }

  // Sort vulnerabilities by severity and then by display_order if available
  private sortVulnerabilities(vulnerabilities: Vulnerability[]): Vulnerability[] {
    return [...vulnerabilities].sort((a, b) => {
      // First sort by severity
      const severityComparison = SEVERITY_ORDER[a.severity.toLowerCase()] - SEVERITY_ORDER[b.severity.toLowerCase()];
      
      // If same severity, sort by display_order if available
      if (severityComparison === 0) {
        if (a.display_order !== undefined && b.display_order !== undefined) {
          return a.display_order - b.display_order;
        }
      }
      
      return severityComparison;
    });
  }

  async generateHtml(): Promise<string> {
    // Group vulnerabilities by severity for the summary
    const sevCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    this.vulnerabilities.forEach(vuln => {
      const sev = vuln.severity.toLowerCase();
      if (sev in sevCounts) {
        sevCounts[sev as keyof typeof sevCounts]++;
      }
    });
    
    // Start building HTML
    let html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.escapeHtml(this.project.title)} - Security Assessment Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 2rem;
          }
          h1, h2, h3, h4 {
            color: #2c3e50;
            margin-top: 1.5rem;
          }
          h1 {
            text-align: center;
            border-bottom: 2px solid #3498db;
            padding-bottom: 0.5rem;
          }
          .report-header {
            margin-bottom: 2rem;
          }
          .report-meta {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1rem;
            margin-bottom: 2rem;
          }
          .meta-item {
            margin-bottom: 0.5rem;
          }
          .meta-label {
            font-weight: bold;
          }
          .severity-summary {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 1rem;
            margin-bottom: 2rem;
          }
          .severity-item {
            text-align: center;
            padding: 1rem;
            border-radius: 4px;
            color: white;
            font-weight: bold;
          }
          .severity-critical { background-color: #e74c3c; }
          .severity-high { background-color: #e67e22; }
          .severity-medium { background-color: #f1c40f; }
          .severity-low { background-color: #2ecc71; }
          .severity-info { background-color: #3498db; }
          .vuln-list {
            margin-bottom: 2rem;
          }
          .vuln-item {
            margin-bottom: 2rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 1rem;
          }
          .vuln-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 1px solid #eee;
          }
          .vuln-title {
            font-size: 1.2rem;
            font-weight: bold;
          }
          .vuln-severity {
            padding: 0.3rem 0.6rem;
            border-radius: 4px;
            color: white;
            font-weight: bold;
          }
          .section {
            margin-bottom: 1rem;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 0.5rem;
          }
          .section-content {
            white-space: pre-wrap;
          }
          .reference-list {
            margin: 0;
            padding-left: 1.5rem;
          }
          img.poc-image {
            max-width: 100%;
            margin: 0.5rem 0;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          code {
            display: block;
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            padding: 0.5rem;
            border-radius: 4px;
            overflow-x: auto;
            white-space: pre;
            font-family: monospace;
            font-size: 0.9rem;
            margin: 0.5rem 0;
          }
          .toc {
            background-color: #f8f9fa;
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 1rem;
            margin: 1rem 0 2rem;
          }
          .toc-title {
            font-size: 1.2rem;
            margin-bottom: 0.5rem;
          }
          .toc-list {
            list-style-type: none;
            margin: 0;
            padding: 0;
          }
          .toc-list ol {
            padding-left: 2rem;
            margin: 0.5rem 0;
          }
          .toc-item {
            margin-bottom: 0.3rem;
          }
          .toc-item a {
            color: #2980b9;
            text-decoration: none;
          }
          .toc-item a:hover {
            text-decoration: underline;
          }
          .request, .response {
            margin-top: 0.5rem;
          }
          .label {
            font-weight: bold;
            color: #555;
            margin-bottom: 0.2rem;
          }
          .request-response {
            margin: 1rem 0;
          }
          .request-code, .response-code {
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            padding: 1rem;
            border-radius: 4px;
            font-family: 'Courier New', Courier, monospace;
            font-size: 0.9rem;
            white-space: pre-wrap;
            overflow-x: auto;
            margin-bottom: 1rem;
          }
          .retest-section {
            margin-top: 1.5rem;
            padding-top: 1rem;
            border-top: 1px dashed #ccc;
          }
          .status-badge {
            display: inline-block;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.875rem;
            font-weight: bold;
            margin-left: 0.5rem;
            border: 1px solid #22c55e;
            color: #22c55e;
          }
        </style>
      </head>
      <body>
        <div class="report-header">
          <h1>${this.escapeHtml(this.project.title)}</h1>
          <h2 style="text-align: center;">Security Assessment Report</h2>
        </div>
        
        <div class="report-meta">
          <div class="meta-item">
            <span class="meta-label">Start Date:</span> ${this.project.start_date}
          </div>
          <div class="meta-item">
            <span class="meta-label">End Date:</span> ${this.project.end_date}
          </div>
          <div class="meta-item">
            <span class="meta-label">Prepared By:</span> ${this.escapeHtml(this.project.preparer)}
          </div>
          <div class="meta-item">
            <span class="meta-label">Reviewed By:</span> ${this.escapeHtml(this.project.reviewer)}
          </div>
          <div class="meta-item">
            <span class="meta-label">Version:</span> ${this.project.version}
          </div>
          <div class="meta-item">
            <span class="meta-label">Report Date:</span> ${new Date().toLocaleDateString()}
          </div>
          ${this.project.version_history ? `
          <div class="meta-item" style="grid-column: span 2;">
            <span class="meta-label">Version History:</span><br>
            ${this.escapeHtml(this.project.version_history)}
          </div>` : ''}
        </div>
    `;

    // Add Table of Contents
    html += `
        <div class="toc">
          <h2 class="toc-title">Table of Contents</h2>
          <ol class="toc-list">
            <li class="toc-item"><a href="#summary">1. Executive Summary</a></li>
            <li class="toc-item"><a href="#findings">2. Findings Summary</a></li>
            <li class="toc-item">
              <a href="#vulnerabilities">3. Vulnerabilities</a>
              <ol>
    `;
    
    // Add vulnerability entries to TOC
    this.vulnerabilities.forEach((vuln, index) => {
      const vulnId = vuln.vulnerability_id || `vuln-${index + 1}`;
      html += `<li class="toc-item"><a href="#${vulnId}">${index + 1}. ${this.escapeHtml(vuln.title)}</a></li>`;
    });
    
    html += `
              </ol>
            </li>
          </ol>
        </div>

        <h2 id="summary">1. Executive Summary</h2>
        <p>
          This security assessment report documents the findings identified during the security testing of ${this.escapeHtml(this.project.title)}.
          The assessment was conducted from ${this.project.start_date} to ${this.project.end_date} by ${this.escapeHtml(this.project.preparer)}
          and reviewed by ${this.escapeHtml(this.project.reviewer)}.
        </p>

        <h2 id="findings">2. Findings Summary</h2>
        <div class="severity-summary">
          <div class="severity-item severity-critical">${sevCounts.critical}<br>Critical</div>
          <div class="severity-item severity-high">${sevCounts.high}<br>High</div>
          <div class="severity-item severity-medium">${sevCounts.medium}<br>Medium</div>
          <div class="severity-item severity-low">${sevCounts.low}<br>Low</div>
          <div class="severity-item severity-info">${sevCounts.info}<br>Info</div>
        </div>

        <h2 id="vulnerabilities">3. Vulnerabilities</h2>
        <div class="vuln-list">
    `;
    
    // Add vulnerability details
    this.vulnerabilities.forEach((vuln, index) => {
      const severityClass = `severity-${vuln.severity.toLowerCase()}`;
      const vulnId = vuln.vulnerability_id || `vuln-${index + 1}`;
      
      html += `
        <div id="${vulnId}" class="vuln-item">
          <div class="vuln-header">
            <div class="vuln-title">
              ${index + 1}. ${vuln.vulnerability_id ? this.escapeHtml(vuln.vulnerability_id) + ' - ' : ''}${this.escapeHtml(vuln.title)}
              ${vuln.current_status ? '<span class="status-badge">Resolved</span>' : ''}
            </div>
            <div class="vuln-severity ${severityClass}">
              ${vuln.severity.toUpperCase()} (${vuln.cvss_score})
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Background:</div>
            <div class="section-content">${this.escapeHtml(vuln.background || '')}</div>
          </div>
          
          <div class="section">
            <div class="section-title">Details:</div>
            <div class="section-content">${this.escapeHtml(vuln.details || '')}</div>
          </div>
      `;
      
      // Add affected versions if available
      if (vuln.affected_versions && vuln.affected_versions.length > 0) {
        html += `
          <div class="section">
            <div class="section-title">Affected Hosts/Versions:</div>
            <ul>
        `;
        
        vuln.affected_versions.forEach((version: any) => {
          html += `<li>${this.escapeHtml(version.name || version.value || JSON.stringify(version))}</li>`;
        });
        
        html += `</ul></div>`;
      }
      
      // Add PoC images if available
      if (vuln.poc_images && vuln.poc_images.length > 0) {
        html += `
          <div class="section">
            <div class="section-title">Proof of Concept:</div>
        `;
        
        vuln.poc_images.forEach((img: any) => {
          html += `
            <figure>
              <img class="poc-image" src="${img.data}" alt="${this.escapeHtml(img.name)}" />
              <figcaption>${this.escapeHtml(img.label || img.name)}</figcaption>
            </figure>
          `;
        });
        
        html += `</div>`;
      }
      
      // Add request/response if available - now with improved formatting
      if (vuln.request_response) {
        html += `
          <div class="section">
            <div class="section-title">Request/Response:</div>
        `;
        
        if (typeof vuln.request_response === 'object') {
          if (vuln.request_response.request) {
            html += `
              <div class="request">
                <div class="label">Request:</div>
                <pre class="request-code">${this.escapeHtml(vuln.request_response.request)}</pre>
              </div>
            `;
          }
          
          if (vuln.request_response.response) {
            html += `
              <div class="response">
                <div class="label">Response:</div>
                <pre class="response-code">${this.escapeHtml(vuln.request_response.response)}</pre>
              </div>
            `;
          }
        } else if (typeof vuln.request_response === 'string') {
          html += `<pre class="request-code">${this.escapeHtml(vuln.request_response)}</pre>`;
        }
        
        html += `</div>`;
      }
      
      html += `
          <div class="section">
            <div class="section-title">Remediation:</div>
            <div class="section-content">${this.escapeHtml(vuln.remediation || '')}</div>
          </div>
      `;
      
      // Add re-test results if the vulnerability is resolved
      if (vuln.current_status && (vuln.retest_result || (vuln.retest_images && vuln.retest_images.length > 0))) {
        html += `
          <div class="retest-section">
            <div class="section-title">Re-Test Results:</div>
        `;
        
        if (vuln.retest_date) {
          html += `<p><strong>Re-Test Date:</strong> ${new Date(vuln.retest_date).toLocaleDateString()}</p>`;
        }
        
        if (vuln.retest_result) {
          html += `<div class="section-content">${this.escapeHtml(vuln.retest_result)}</div>`;
        }
        
        // Add re-test images if available
        if (vuln.retest_images && vuln.retest_images.length > 0) {
          html += `
            <div class="section">
              <div class="section-title">Re-Test Evidence:</div>
          `;
          
          vuln.retest_images.forEach((img: any) => {
            html += `
              <figure>
                <img class="poc-image" src="${img.data}" alt="${this.escapeHtml(img.name)}" />
                <figcaption>${this.escapeHtml(img.label || img.name)}</figcaption>
              </figure>
            `;
          });
          
          html += `</div>`;
        }
        
        html += `</div>`;
      }
      
      // Add references if available
      if (vuln.ref_links && vuln.ref_links.length > 0) {
        html += `
          <div class="section">
            <div class="section-title">References:</div>
            <ul class="reference-list">
        `;
        
        vuln.ref_links.forEach((link: string) => {
          html += `<li><a href="${this.escapeHtml(link)}" target="_blank">${this.escapeHtml(link)}</a></li>`;
        });
        
        html += `</ul></div>`;
      }
      
      html += `</div>`;
    });
    
    html += `
        </div>
      </body>
      </html>
    `;
    
    return html;
  }

  async generateMarkdown(): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Group vulnerabilities by severity for the summary
    const sevCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    this.vulnerabilities.forEach(vuln => {
      const sev = vuln.severity.toLowerCase();
      if (sev in sevCounts) {
        sevCounts[sev as keyof typeof sevCounts]++;
      }
    });
    
    let markdown = `# ${this.project.title} - Security Assessment Report\n\n`;
    
    // Table of Contents
    markdown += `## Table of Contents\n\n`;
    markdown += `1. [Report Information](#report-information)\n`;
    markdown += `2. [Findings Summary](#findings-summary)\n`;
    markdown += `3. [Vulnerabilities](#vulnerabilities)\n`;
    this.vulnerabilities.forEach((vuln, index) => {
      markdown += `   ${index + 1}. [${vuln.title}](#vuln-${index + 1})\n`;
    });
    markdown += `\n`;
    
    markdown += `## Report Information\n\n`;
    markdown += `- **Start Date:** ${this.project.start_date}\n`;
    markdown += `- **End Date:** ${this.project.end_date}\n`;
    markdown += `- **Prepared By:** ${this.project.preparer}\n`;
    markdown += `- **Reviewed By:** ${this.project.reviewer}\n`;
    markdown += `- **Version:** ${this.project.version}\n`;
    markdown += `- **Report Date:** ${timestamp}\n`;
    
    if (this.project.version_history) {
      markdown += `- **Version History:**\n${this.project.version_history}\n`;
    }
    
    markdown += `\n## Findings Summary\n\n`;
    markdown += `| Critical | High | Medium | Low | Info |\n`;
    markdown += `|:--------:|:----:|:------:|:---:|:----:|\n`;
    markdown += `| ${sevCounts.critical} | ${sevCounts.high} | ${sevCounts.medium} | ${sevCounts.low} | ${sevCounts.info} |\n\n`;
    
    markdown += `## Vulnerabilities\n\n`;
    
    // Add vulnerability details
    this.vulnerabilities.forEach((vuln, index) => {
      const vulnId = vuln.vulnerability_id || `${index + 1}`;
      markdown += `<a name="vuln-${index + 1}"></a>\n`;
      markdown += `### ${vulnId}. ${vuln.title}`;
      
      if (vuln.current_status) {
        markdown += ` (RESOLVED)\n\n`;
      } else {
        markdown += `\n\n`;
      }
      
      markdown += `**Severity:** ${vuln.severity.toUpperCase()} (${vuln.cvss_score})\n\n`;
      
      markdown += `#### Background\n\n${vuln.background || 'N/A'}\n\n`;
      
      markdown += `#### Details\n\n${vuln.details || 'N/A'}\n\n`;
      
      // Add affected versions if available
      if (vuln.affected_versions && vuln.affected_versions.length > 0) {
        markdown += `#### Affected Hosts/Versions\n\n`;
        vuln.affected_versions.forEach((version: any) => {
          markdown += `- ${version.name || version.value || JSON.stringify(version)}\n`;
        });
        markdown += `\n`;
      }
      
      // PoC images can't be directly included in markdown as base64
      // Instead, we'll mention that images are available
      if (vuln.poc_images && vuln.poc_images.length > 0) {
        markdown += `#### Proof of Concept\n\n`;
        markdown += `*${vuln.poc_images.length} screenshot(s) available in HTML report*\n\n`;
      }
      
      // Add request/response if available with better code formatting
      if (vuln.request_response) {
        markdown += `#### Request/Response\n\n`;
        
        if (typeof vuln.request_response === 'object') {
          if (vuln.request_response.request) {
            markdown += `**Request:**\n\n\`\`\`\n${vuln.request_response.request}\n\`\`\`\n\n`;
          }
          
          if (vuln.request_response.response) {
            markdown += `**Response:**\n\n\`\`\`\n${vuln.request_response.response}\n\`\`\`\n\n`;
          }
        } else if (typeof vuln.request_response === 'string') {
          markdown += `\`\`\`\n${vuln.request_response}\n\`\`\`\n\n`;
        }
      }
      
      markdown += `#### Remediation\n\n${vuln.remediation || 'N/A'}\n\n`;
      
      // Add re-test results if the vulnerability is resolved
      if (vuln.current_status && (vuln.retest_result || (vuln.retest_images && vuln.retest_images.length > 0))) {
        markdown += `#### Re-Test Results\n\n`;
        
        if (vuln.retest_date) {
          markdown += `**Re-Test Date:** ${new Date(vuln.retest_date).toLocaleDateString()}\n\n`;
        }
        
        if (vuln.retest_result) {
          markdown += `${vuln.retest_result}\n\n`;
        }
        
        // Mention re-test images if available
        if (vuln.retest_images && vuln.retest_images.length > 0) {
          markdown += `*${vuln.retest_images.length} re-test evidence image(s) available in HTML report*\n\n`;
        }
      }
      
      // Add references if available
      if (vuln.ref_links && vuln.ref_links.length > 0) {
        markdown += `#### References\n\n`;
        vuln.ref_links.forEach(link => {
          markdown += `- ${link}\n`;
        });
        markdown += `\n`;
      }
      
      markdown += `---\n\n`;
    });
    
    return markdown;
  }
  
  private escapeHtml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
