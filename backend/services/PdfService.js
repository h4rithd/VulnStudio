
const puppeteer = require('puppeteer');
const TemplateService = require('./TemplateService');
const pool = require('../config/database');

class PdfService {
  constructor() {
    this.browser = null;
  }

  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: '/opt/homebrew/bin/chromium',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-extensions',
          '--disable-features=VizDisplayCompositor'
        ]
      });
    }
    return this.browser;
  }

  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async generatePdf(reportId, userId, tempProjectData = null) {
    let browser = null;
    let page = null;

    try {
      console.log('Starting PDF generation for report:', reportId);
      
      // Fetch report data (handle temp projects)
      const reportData = await this.fetchReportData(reportId, userId, tempProjectData);
      console.log('Report data fetched successfully');
      
      // Generate HTML content
      const htmlContent = await TemplateService.generateReportHtml(reportData);
      console.log('HTML content generated, length:', htmlContent.length);
      
      // Initialize browser
      browser = await this.initBrowser();
      page = await browser.newPage();
      console.log('Browser and page initialized');
      
      // Set viewport and content
      await page.setViewport({ width: 1200, height: 1600 });
      
      // Set content and wait for it to load
      await page.setContent(htmlContent, { 
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 60000 
      });
      console.log('HTML content set in page');

      // Wait for all images to load (including base64 images)
      await page.evaluate(() => {
        return new Promise((resolve) => {
          const images = Array.from(document.images);
          if (images.length === 0) {
            resolve();
            return;
          }
          
          let loadedCount = 0;
          const checkComplete = () => {
            loadedCount++;
            if (loadedCount >= images.length) {
              resolve();
            }
          };
          
          images.forEach(img => {
            if (img.complete) {
              checkComplete();
            } else {
              img.onload = checkComplete;
              img.onerror = checkComplete;
            }
          });
          
          // Fallback timeout
          setTimeout(resolve, 5000);
        });
      });
      console.log('Images loaded');
      
      // Generate PDF with proper binary buffer handling
      const pdfData = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '20mm',
          bottom: '20mm',
          left: '15mm',
          right: '15mm'
        },
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666; margin: 0 20mm;">
            <span>${reportData.project.title || 'Security Assessment Report'}</span>
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; color: #666; margin: 0 20mm;">
            <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
          </div>
        `
      });

      console.log('PDF generated successfully');
      console.log('PDF data type:', typeof pdfData);
      console.log('PDF data length:', pdfData ? pdfData.length : 'undefined');
      console.log('PDF data is Buffer:', Buffer.isBuffer(pdfData));
      console.log('PDF data is Uint8Array:', pdfData instanceof Uint8Array);
      
      // Convert to proper Buffer if needed
      let pdfBuffer;
      if (Buffer.isBuffer(pdfData)) {
        pdfBuffer = pdfData;
      } else if (pdfData instanceof Uint8Array) {
        pdfBuffer = Buffer.from(pdfData);
      } else if (pdfData && typeof pdfData === 'object' && pdfData.length !== undefined) {
        // Handle case where it's an array-like object
        pdfBuffer = Buffer.from(pdfData);
      } else {
        throw new Error('PDF generation returned invalid data type');
      }
      
      console.log('Final PDF buffer type:', typeof pdfBuffer);
      console.log('Final PDF buffer length:', pdfBuffer.length);
      console.log('Final PDF buffer is Buffer:', Buffer.isBuffer(pdfBuffer));
      
      // Validate the buffer has content
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF generation returned empty buffer');
      }
      
      // Validate it looks like a PDF (starts with %PDF)
      const pdfHeader = pdfBuffer.toString('ascii', 0, 4);
      if (pdfHeader !== '%PDF') {
        console.log('Buffer start:', pdfBuffer.toString('ascii', 0, 20));
        throw new Error('Generated data does not appear to be a valid PDF');
      }
      
      console.log('PDF buffer validated successfully');
      return pdfBuffer;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async fetchReportData(reportId, userId, tempProjectData = null) {
    // Handle temporary projects
    if (reportId.startsWith('temp_')) {
      console.log('Processing temporary project:', reportId);
      
      if (!tempProjectData) {
        throw new Error('Temporary project data not provided');
      }
      
      const { project, vulnerabilities } = tempProjectData;
      
      // Process vulnerabilities for temporary projects
      const processedVulnerabilities = vulnerabilities.map(vuln => ({
        ...vuln,
        ref_links: Array.isArray(vuln.ref_links) ? vuln.ref_links : JSON.parse(vuln.ref_links || '[]'),
        affected_versions: Array.isArray(vuln.affected_versions) ? vuln.affected_versions : JSON.parse(vuln.affected_versions || '[]'),
        request_response: typeof vuln.request_response === 'object' ? vuln.request_response : JSON.parse(vuln.request_response || '{}'),
        poc_images: Array.isArray(vuln.poc_images) ? vuln.poc_images : JSON.parse(vuln.poc_images || '[]'),
        retest_images: Array.isArray(vuln.retest_images) ? vuln.retest_images : JSON.parse(vuln.retest_images || '[]')
      }));

      // Calculate statistics
      const stats = this.calculateVulnerabilityStats(processedVulnerabilities);
      
      const reportData = {
        project,
        vulnerabilities: processedVulnerabilities,
        stats,
        metadata: {
          generatedDate: new Date().toISOString(),
          generatedBy: 'VulnStudio Professional Report Generator',
          version: '1.0',
          totalPages: this.estimatePageCount(processedVulnerabilities),
          docVersion: project.version || 'v1.0',
          releaseDate: new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          authorName: project.preparer || 'Security Team',
          authorEmail: project.preparer_email || 'security@company.com'
        }
      };
      
      console.log('Temporary project data prepared with stats:', stats);
      return reportData;
    }
    
    // Handle regular database projects
    const client = await pool.connect();
    
    try {
      console.log('Fetching report data for:', reportId);
      
      // Fetch project data
      const projectResult = await client.query(
        'SELECT * FROM reports WHERE id = $1 AND created_by = $2',
        [reportId, userId]
      );
      
      if (projectResult.rows.length === 0) {
        throw new Error('Project not found or access denied');
      }
      
      const project = projectResult.rows[0];
      console.log('Project found:', project.title);
      
      // Fetch vulnerabilities
      const vulnResult = await client.query(`
        SELECT * FROM vulnerabilities 
        WHERE report_id = $1 
        ORDER BY 
          CASE severity 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            WHEN 'info' THEN 5
            ELSE 6
          END,
          display_order ASC,
          created_at ASC
      `, [reportId]);
      
      console.log('Vulnerabilities found:', vulnResult.rows.length);
      
      // Process vulnerabilities
      const vulnerabilities = vulnResult.rows.map(vuln => ({
        ...vuln,
        ref_links: typeof vuln.ref_links === 'string' ? JSON.parse(vuln.ref_links || '[]') : (vuln.ref_links || []),
        affected_versions: typeof vuln.affected_versions === 'string' ? JSON.parse(vuln.affected_versions || '[]') : (vuln.affected_versions || []),
        request_response: typeof vuln.request_response === 'string' ? JSON.parse(vuln.request_response || '{}') : (vuln.request_response || {}),
        poc_images: typeof vuln.poc_images === 'string' ? JSON.parse(vuln.poc_images || '[]') : (vuln.poc_images || []),
        retest_images: typeof vuln.retest_images === 'string' ? JSON.parse(vuln.retest_images || '[]') : (vuln.retest_images || [])
      }));

      // Calculate statistics
      const stats = this.calculateVulnerabilityStats(vulnerabilities);
      
      const reportData = {
        project,
        vulnerabilities,
        stats,
        metadata: {
          generatedDate: new Date().toISOString(),
          generatedBy: 'VulnStudio Professional Report Generator',
          version: '1.0',
          totalPages: this.estimatePageCount(vulnerabilities),
          docVersion: project.version || 'v1.0',
          releaseDate: new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          authorName: project.preparer || 'Security Team',
          authorEmail: project.preparer_email || 'security@company.com'
        }
      };
      
      console.log('Report data prepared with stats:', stats);
      return reportData;
    } finally {
      client.release();
    }
  }

  calculateVulnerabilityStats(vulnerabilities) {
    const stats = {
      total: vulnerabilities.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
      open: 0,
      closed: 0
    };

    vulnerabilities.forEach(vuln => {
      const severity = vuln.severity.toLowerCase();
      stats[severity] = (stats[severity] || 0) + 1;
      
      if (vuln.current_status) {
        stats.open++;
      } else {
        stats.closed++;
      }
    });

    return stats;
  }

  estimatePageCount(vulnerabilities) {
    // Estimate: Cover(1) + Disclaimer(1) + Doc Control(1) + TOC(1) + 
    // Executive Summary(1) + Spotlight(1) + Vulnerabilities(1 per vuln) + Conclusion(1)
    return 7 + vulnerabilities.length;
  }
}

module.exports = new PdfService();
