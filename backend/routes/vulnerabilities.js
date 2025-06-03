
const express = require('express');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Helper function to check if ID is a temporary project ID
const isTempId = (id) => {
  return typeof id === 'string' && id.startsWith('temp_');
};

// Helper function to validate UUID format
const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// Get vulnerabilities by report ID - Enhanced for temporary projects with better data structure
router.get('/report/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    
    // Enhanced handling for temporary projects
    if (isTempId(reportId)) {
      console.log('Temporary project vulnerabilities requested for:', reportId);
      
      // For temporary projects, return structured response that frontend can handle
      return res.json({ 
        data: [], 
        success: true, 
        isTemporary: true,
        reportId: reportId,
        message: 'Temporary project - vulnerabilities managed by frontend',
        // Provide structure that frontend expects
        vulnerabilityStructure: {
          id: 'string',
          report_id: 'string', 
          title: 'string',
          severity: 'string',
          cvss_score: 'number',
          cvss_vector: 'string',
          background: 'string',
          details: 'string',
          remediation: 'string',
          ref_links: 'array',
          affected_versions: 'array',
          vulnerability_id: 'string',
          display_order: 'number',
          current_status: 'boolean',
          request_response: 'object',
          poc_images: 'array',
          retest_date: 'string|null',
          retest_result: 'string|null',
          retest_images: 'array',
          created_at: 'string',
          updated_at: 'string'
        }
      });
    }
    
    // Validate UUID format for regular IDs
    if (!isValidUUID(reportId)) {
      return res.status(400).json({ error: 'Invalid report ID format', success: false });
    }
    
    // Enhanced query with better ordering and complete data retrieval
    const result = await pool.query(`
      SELECT v.*, r.title as report_title,
             CASE 
               WHEN r.title LIKE 'Re-test:%' OR r.title LIKE 'Retest:%' OR r.status = 'retest' 
               THEN true 
               ELSE false 
             END as is_retest_project
      FROM vulnerabilities v 
      LEFT JOIN reports r ON v.report_id = r.id
      WHERE v.report_id = $1 
      ORDER BY 
        CASE v.severity 
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          WHEN 'info' THEN 5
          ELSE 6
        END,
        v.display_order ASC,
        v.created_at ASC
    `, [reportId]);
    
    // Process the results to ensure JSON fields are properly parsed
    const processedVulnerabilities = result.rows.map(vuln => ({
      ...vuln,
      ref_links: typeof vuln.ref_links === 'string' ? JSON.parse(vuln.ref_links || '[]') : (vuln.ref_links || []),
      affected_versions: typeof vuln.affected_versions === 'string' ? JSON.parse(vuln.affected_versions || '[]') : (vuln.affected_versions || []),
      request_response: typeof vuln.request_response === 'string' ? JSON.parse(vuln.request_response || '{}') : (vuln.request_response || {}),
      poc_images: typeof vuln.poc_images === 'string' ? JSON.parse(vuln.poc_images || '[]') : (vuln.poc_images || []),
      retest_images: typeof vuln.retest_images === 'string' ? JSON.parse(vuln.retest_images || '[]') : (vuln.retest_images || [])
    }));
    
    res.json({ data: processedVulnerabilities, success: true });
  } catch (error) {
    console.error('Get vulnerabilities error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Get vulnerability by ID (including quick view details) - Enhanced
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle temporary vulnerability IDs
    if (id.startsWith('temp_vuln_')) {
      return res.status(404).json({ 
        error: 'Temporary vulnerabilities not found in database', 
        success: false,
        isTemporary: true,
        message: 'Temporary vulnerabilities are managed by frontend'
      });
    }
    
    // Validate UUID format for regular IDs
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid vulnerability ID format', success: false });
    }
    
    const result = await pool.query(`
      SELECT v.*, r.title as report_title,
             CASE 
               WHEN r.title LIKE 'Re-test:%' OR r.title LIKE 'Retest:%' OR r.status = 'retest' 
               THEN true 
               ELSE false 
             END as is_retest_project
      FROM vulnerabilities v 
      LEFT JOIN reports r ON v.report_id = r.id 
      WHERE v.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vulnerability not found', success: false });
    }

    // Process JSON fields
    const vulnerability = result.rows[0];
    const processedVulnerability = {
      ...vulnerability,
      ref_links: typeof vulnerability.ref_links === 'string' ? JSON.parse(vulnerability.ref_links || '[]') : (vulnerability.ref_links || []),
      affected_versions: typeof vulnerability.affected_versions === 'string' ? JSON.parse(vulnerability.affected_versions || '[]') : (vulnerability.affected_versions || []),
      request_response: typeof vulnerability.request_response === 'string' ? JSON.parse(vulnerability.request_response || '{}') : (vulnerability.request_response || {}),
      poc_images: typeof vulnerability.poc_images === 'string' ? JSON.parse(vulnerability.poc_images || '[]') : (vulnerability.poc_images || []),
      retest_images: typeof vulnerability.retest_images === 'string' ? JSON.parse(vulnerability.retest_images || '[]') : (vulnerability.retest_images || [])
    };

    res.json({ data: processedVulnerability, success: true });
  } catch (error) {
    console.error('Get vulnerability error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Helper function to generate vulnerability ID with enhanced logic
const generateVulnerabilityId = async (reportId, severity, order) => {
  try {
    // Handle temporary projects
    if (isTempId(reportId)) {
      const severityCode = severity.charAt(0).toUpperCase();
      const orderPadded = String(order || 1).padStart(2, '0');
      return `TEMP-${severityCode}-${orderPadded}`;
    }
    
    // Get report title and check if it's a retest
    const reportResult = await pool.query('SELECT title, status FROM reports WHERE id = $1', [reportId]);
    if (reportResult.rows.length === 0) {
      return `VULN-${Date.now()}`;
    }
    
    const report = reportResult.rows[0];
    const isRetest = report.title.toLowerCase().includes('re-test') || 
                    report.title.toLowerCase().includes('retest') || 
                    report.status === 'retest';
    
    // Generate project abbreviation
    const projectAbbrev = report.title
      .replace(/^(Re-test:|Retest:)\s*/i, '') // Remove retest prefix for abbreviation
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 3);
    
    const severityCode = severity.charAt(0).toUpperCase();
    const orderPadded = String(order || 1).padStart(2, '0');
    const prefix = isRetest ? 'RT-' : '';
    
    return `${prefix}${projectAbbrev}-${severityCode}-${orderPadded}`;
  } catch (error) {
    console.error('Error generating vulnerability ID:', error);
    return `VULN-${Date.now()}`;
  }
};

// Create vulnerability - Enhanced to handle complete data import
router.post('/', async (req, res) => {
  try {
    const {
      title, severity, cvss_score, cvss_vector, background, details, remediation,
      ref_links, affected_versions, report_id, vulnerability_id, display_order,
      current_status, request_response, poc_images, retest_date, retest_result, 
      retest_images, auto_generate_id
    } = req.body;
    
    // Handle temporary projects - don't allow creation
    if (isTempId(report_id)) {
      return res.status(400).json({ 
        error: 'Cannot create vulnerabilities for temporary projects', 
        success: false,
        isTemporary: true,
        message: 'Temporary vulnerabilities should be managed by frontend'
      });
    }
    
    // Validate UUID format for report_id
    if (!isValidUUID(report_id)) {
      return res.status(400).json({ error: 'Invalid report ID format', success: false });
    }
    
    const id = uuidv4();
    const created_by = req.user.id;

    // Generate ID if auto_generate_id is true and no vulnerability_id provided
    let finalVulnId = vulnerability_id;
    if (auto_generate_id && !vulnerability_id) {
      // Get the next order number for this report and severity
      const orderResult = await pool.query(
        'SELECT COALESCE(MAX(display_order), 0) + 1 as next_order FROM vulnerabilities WHERE report_id = $1',
        [report_id]
      );
      const nextOrder = orderResult.rows[0]?.next_order || 1;
      finalVulnId = await generateVulnerabilityId(report_id, severity, nextOrder);
    }

    // Enhanced insert query to handle all fields including retest data with proper JSON handling
    const result = await pool.query(`
      INSERT INTO vulnerabilities (
        id, title, severity, cvss_score, cvss_vector, background, details, remediation,
        ref_links, affected_versions, report_id, vulnerability_id, display_order,
        current_status, request_response, poc_images, retest_date, retest_result, 
        retest_images, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
      RETURNING *
    `, [
      id, title || '', severity || 'medium', parseFloat(cvss_score) || 0.0, cvss_vector || '', 
      background || '', details || '', remediation || '',
      JSON.stringify(ref_links || []), JSON.stringify(affected_versions || []), report_id,
      finalVulnId, parseInt(display_order) || 0, Boolean(current_status),
      JSON.stringify(request_response || {}), JSON.stringify(poc_images || []),
      retest_date || null, retest_result || null, JSON.stringify(retest_images || []), created_by
    ]);

    // Process the response to ensure JSON fields are properly parsed
    const createdVulnerability = result.rows[0];
    const processedResponse = {
      ...createdVulnerability,
      ref_links: typeof createdVulnerability.ref_links === 'string' ? JSON.parse(createdVulnerability.ref_links || '[]') : (createdVulnerability.ref_links || []),
      affected_versions: typeof createdVulnerability.affected_versions === 'string' ? JSON.parse(createdVulnerability.affected_versions || '[]') : (createdVulnerability.affected_versions || []),
      request_response: typeof createdVulnerability.request_response === 'string' ? JSON.parse(createdVulnerability.request_response || '{}') : (createdVulnerability.request_response || {}),
      poc_images: typeof createdVulnerability.poc_images === 'string' ? JSON.parse(createdVulnerability.poc_images || '[]') : (createdVulnerability.poc_images || []),
      retest_images: typeof createdVulnerability.retest_images === 'string' ? JSON.parse(createdVulnerability.retest_images || '[]') : (createdVulnerability.retest_images || [])
    };

    res.json({ data: processedResponse, success: true });
  } catch (error) {
    console.error('Create vulnerability error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Generate ID for existing vulnerability - Enhanced
router.post('/:id/generate-id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid vulnerability ID format', success: false });
    }
    
    // Get vulnerability details
    const vulnResult = await pool.query('SELECT * FROM vulnerabilities WHERE id = $1', [id]);
    if (vulnResult.rows.length === 0) {
      return res.status(404).json({ error: 'Vulnerability not found', success: false });
    }
    
    const vuln = vulnResult.rows[0];
    
    // Only generate ID if one doesn't exist
    if (vuln.vulnerability_id) {
      return res.json({ data: vuln, success: true });
    }
    
    // Generate new ID with enhanced logic
    const newId = await generateVulnerabilityId(vuln.report_id, vuln.severity, vuln.display_order || 1);
    
    // Update vulnerability with new ID
    const result = await pool.query(
      'UPDATE vulnerabilities SET vulnerability_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newId, id]
    );
    
    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Generate vulnerability ID error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Update vulnerability - Enhanced to handle all fields with proper JSON processing
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid vulnerability ID format', success: false });
    }
    
    // Handle JSON fields with enhanced processing
    if (updates.ref_links) {
      updates.ref_links = Array.isArray(updates.ref_links) ? 
        JSON.stringify(updates.ref_links) : 
        JSON.stringify(JSON.parse(updates.ref_links || '[]'));
    }
    if (updates.affected_versions) {
      updates.affected_versions = Array.isArray(updates.affected_versions) ? 
        JSON.stringify(updates.affected_versions) : 
        JSON.stringify(JSON.parse(updates.affected_versions || '[]'));
    }
    if (updates.request_response) {
      updates.request_response = typeof updates.request_response === 'object' ? 
        JSON.stringify(updates.request_response) : 
        JSON.stringify(JSON.parse(updates.request_response || '{}'));
    }
    if (updates.poc_images) {
      updates.poc_images = Array.isArray(updates.poc_images) ? 
        JSON.stringify(updates.poc_images) : 
        JSON.stringify(JSON.parse(updates.poc_images || '[]'));
    }
    if (updates.retest_images) {
      updates.retest_images = Array.isArray(updates.retest_images) ? 
        JSON.stringify(updates.retest_images) : 
        JSON.stringify(JSON.parse(updates.retest_images || '[]'));
    }
    
    // Handle numeric fields
    if (updates.cvss_score !== undefined) {
      updates.cvss_score = parseFloat(updates.cvss_score) || 0.0;
    }
    if (updates.display_order !== undefined) {
      updates.display_order = parseInt(updates.display_order) || 0;
    }
    if (updates.current_status !== undefined) {
      updates.current_status = Boolean(updates.current_status);
    }
    
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(updates)];
    
    const result = await pool.query(`
      UPDATE vulnerabilities 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `, values);

    // Process the response to ensure JSON fields are properly parsed
    const updatedVulnerability = result.rows[0];
    const processedResponse = {
      ...updatedVulnerability,
      ref_links: typeof updatedVulnerability.ref_links === 'string' ? JSON.parse(updatedVulnerability.ref_links || '[]') : (updatedVulnerability.ref_links || []),
      affected_versions: typeof updatedVulnerability.affected_versions === 'string' ? JSON.parse(updatedVulnerability.affected_versions || '[]') : (updatedVulnerability.affected_versions || []),
      request_response: typeof updatedVulnerability.request_response === 'string' ? JSON.parse(updatedVulnerability.request_response || '{}') : (updatedVulnerability.request_response || {}),
      poc_images: typeof updatedVulnerability.poc_images === 'string' ? JSON.parse(updatedVulnerability.poc_images || '[]') : (updatedVulnerability.poc_images || []),
      retest_images: typeof updatedVulnerability.retest_images === 'string' ? JSON.parse(updatedVulnerability.retest_images || '[]') : (updatedVulnerability.retest_images || [])
    };

    res.json({ data: processedResponse, success: true });
  } catch (error) {
    console.error('Update vulnerability error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Delete vulnerability - Enhanced
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle temporary vulnerability IDs
    if (id.startsWith('temp_vuln_')) {
      return res.json({ 
        success: true,
        isTemporary: true,
        message: 'Temporary vulnerability deletion handled by frontend'
      });
    }
    
    // Validate UUID format
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid vulnerability ID format', success: false });
    }
    
    await pool.query('DELETE FROM vulnerabilities WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete vulnerability error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

module.exports = router;
