
const pool = require('../config/database');
const archiver = require('archiver');

const exportProjectZip = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const created_by = req.user.id;

    // Handle cloud project export only (temporary projects are handled client-side)
    const client = await pool.connect();
    
    try {
      // Fetch project data
      const projectResult = await client.query(
        'SELECT * FROM reports WHERE id = $1 AND created_by = $2',
        [projectId, created_by]
      );
      
      if (projectResult.rows.length === 0) {
        return res.status(404).json({ 
          error: 'Project not found or access denied',
          success: false 
        });
      }
      
      const projectData = projectResult.rows[0];
      
      // Fetch vulnerabilities
      const vulnResult = await client.query(
        'SELECT * FROM vulnerabilities WHERE report_id = $1 ORDER BY display_order',
        [projectId]
      );
      
      const vulnerabilities = vulnResult.rows;

      // Create export data structure
      const exportData = {
        project: projectData,
        vulnerabilities: vulnerabilities,
        metadata: {
          exportDate: new Date().toISOString(),
          exportedBy: 'Security Assessment Tool',
          version: '1.0',
          projectId: projectData.id,
          vulnerabilityCount: vulnerabilities.length,
          isTemporary: false
        }
      };

      // Generate HTML report
      const htmlContent = generateHTMLReport(projectData, vulnerabilities);

      // Set response headers for ZIP download
      const filename = `${projectData.title.replace(/\s+/g, '_')}_export.zip`;
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      // Create ZIP archive
      const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Handle archive errors
      archive.on('error', (err) => {
        console.error('Archive error:', err);
        res.status(500).json({ error: 'Failed to create archive', success: false });
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add unencrypted files
      archive.append(JSON.stringify(exportData, null, 2), { name: 'project_export.json' });

      // Add HTML report
      archive.append(htmlContent, { name: 'report.html' });

      // Add metadata
      archive.append(JSON.stringify(exportData.metadata, null, 2), { name: 'metadata.json' });

      // Finalize the archive
      await archive.finalize();

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: error.message || 'Export failed',
      success: false 
    });
  }
};

const generateHTMLReport = (project, vulnerabilities) => {
  const sortedVulnerabilities = [...vulnerabilities].sort((a, b) => {
    const severityOrder = {
      'critical': 1,
      'high': 2,
      'medium': 3,
      'low': 4,
      'info': 5
    };
    
    return (severityOrder[a.severity.toLowerCase()] || 0) - (severityOrder[b.severity.toLowerCase()] || 0);
  });
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${project.title} - Security Assessment Report</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 40px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        .project-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 40px;
        }
        .vulnerability {
          border: 1px solid #ddd;
          margin-bottom: 30px;
          padding: 20px;
          border-radius: 5px;
        }
        .severity {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 3px;
          color: white;
          font-weight: bold;
          text-transform: uppercase;
        }
        .severity.critical { background-color: #dc3545; }
        .severity.high { background-color: #fd7e14; }
        .severity.medium { background-color: #ffc107; color: #333; }
        .severity.low { background-color: #28a745; }
        .severity.info { background-color: #17a2b8; }
        .section {
          margin-bottom: 20px;
        }
        .section h4 {
          margin-bottom: 10px;
          color: #555;
        }
        pre {
          background-color: #f8f9fa;
          padding: 10px;
          border-radius: 3px;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${project.title}</h1>
        <h2>Security Assessment Report</h2>
      </div>
      
      <div class="project-info">
        <div>
          <p><strong>Start Date:</strong> ${project.start_date}</p>
          <p><strong>End Date:</strong> ${project.end_date}</p>
          <p><strong>Preparer:</strong> ${project.preparer}</p>
        </div>
        <div>
          <p><strong>Reviewer:</strong> ${project.reviewer}</p>
          <p><strong>Version:</strong> ${project.version}</p>
          <p><strong>Status:</strong> ${project.status}</p>
        </div>
      </div>
      
      <h2>Vulnerabilities</h2>
      ${sortedVulnerabilities.map((vuln, index) => `
        <div class="vulnerability">
          <h3>${index + 1}. ${vuln.title}</h3>
          <span class="severity ${vuln.severity.toLowerCase()}">${vuln.severity} (${vuln.cvss_score})</span>
          
          <div class="section">
            <h4>Background</h4>
            <p>${vuln.background}</p>
          </div>
          
          <div class="section">
            <h4>Details</h4>
            <p>${vuln.details}</p>
          </div>
          
          <div class="section">
            <h4>Remediation</h4>
            <p>${vuln.remediation}</p>
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;
};

module.exports = {
  exportProjectZip
};
