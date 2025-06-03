
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { isValidUUID } = require('../utils/idHelpers');

// Enhanced Duplicate project functionality with proper retest support
const duplicateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { newTitle, newVersion, type } = req.body;
    const newId = uuidv4();
    const created_by = req.user.id;

    // Validate UUID format for the original project
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid project ID format', success: false });
    }

    // Get original report
    const originalReport = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
    if (originalReport.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found', success: false });
    }

    const report = originalReport.rows[0];

    // Handle scope properly - ensure it's valid JSON
    let scopeJson = report.scope;
    if (typeof scopeJson === 'string') {
      try {
        scopeJson = JSON.parse(scopeJson);
      } catch (e) {
        scopeJson = [];
      }
    }

    // Set status and title based on type - use 'draft' status but mark as retest in title
    let finalStatus = 'draft'; // Always use 'draft' as it's a valid status
    let finalTitle = newTitle;
    let isRetest = false;
    
    if (type === 'retest') {
      isRetest = true;
      // Ensure retest projects have proper naming
      if (!finalTitle.toLowerCase().includes('re-test') && !finalTitle.toLowerCase().includes('retest')) {
        finalTitle = `Re-test: ${finalTitle}`;
      }
    }

    console.log('Creating duplicate project:', { type, finalStatus, finalTitle, isRetest });

    // Create new report with retest support using valid status
    const newReport = await pool.query(`
      INSERT INTO reports (id, title, start_date, end_date, preparer, reviewer, preparer_email, reviewer_email, scope, status, version, version_history, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `, [newId, finalTitle, report.start_date, report.end_date, report.preparer, report.reviewer, report.preparer_email, report.reviewer_email, JSON.stringify(scopeJson), finalStatus, newVersion, report.version_history || '', created_by]);

    // Copy all vulnerabilities with complete data preservation
    const vulnerabilities = await pool.query('SELECT * FROM vulnerabilities WHERE report_id = $1 ORDER BY display_order', [id]);
    
    for (const vuln of vulnerabilities.rows) {
      const vulnId = uuidv4();
      await pool.query(`
        INSERT INTO vulnerabilities (
          id, title, severity, cvss_score, cvss_vector, background, details, 
          remediation, ref_links, affected_versions, report_id, vulnerability_id, 
          display_order, current_status, request_response, poc_images, 
          retest_date, retest_result, retest_images, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      `, [
        vulnId, vuln.title, vuln.severity, vuln.cvss_score, vuln.cvss_vector, 
        vuln.background, vuln.details, vuln.remediation, 
        JSON.stringify(vuln.ref_links || []), JSON.stringify(vuln.affected_versions || []), 
        newId, vuln.vulnerability_id, vuln.display_order, vuln.current_status, 
        JSON.stringify(vuln.request_response || {}), JSON.stringify(vuln.poc_images || []), 
        vuln.retest_date, vuln.retest_result, JSON.stringify(vuln.retest_images || []), 
        created_by
      ]);
    }

    // Add retest flag to the response based on title
    const responseData = {
      ...newReport.rows[0],
      is_retest: isRetest
    };

    console.log('Successfully created duplicate project with status:', finalStatus, 'is_retest:', isRetest);
    res.json({ data: responseData, success: true });
  } catch (error) {
    console.error('Duplicate project error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
};

module.exports = {
  duplicateProject
};
