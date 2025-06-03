const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { isTempId, isValidUUID } = require('../utils/idHelpers');

// Get all reports with enhanced filtering support for retest and status
const getAllReports = async (req, res) => {
  try {
    const { status, type } = req.query;
    
    let whereClause = '';
    let queryParams = [];
    
    // Add status filter
    if (status && status !== 'all') {
      whereClause += ' WHERE r.status = $1';
      queryParams.push(status);
    }
    
    // Add retest filter - enhanced to handle both title patterns and status
    if (type === 'retest') {
      const reTestCondition = " AND (r.title ILIKE 'Re-test:%' OR r.title ILIKE 'Retest:%' OR r.status = 'retest')";
      if (whereClause) {
        whereClause += reTestCondition;
      } else {
        whereClause = ' WHERE' + reTestCondition.substring(5); // Remove ' AND'
      }
    }
    
    // Add initial assessment filter - explicitly exclude retest projects
    if (type === 'initial') {
      const initialCondition = " AND NOT (r.title ILIKE 'Re-test:%' OR r.title ILIKE 'Retest:%' OR r.status = 'retest')";
      if (whereClause) {
        whereClause += initialCondition;
      } else {
        whereClause = ' WHERE' + initialCondition.substring(5); // Remove ' AND'
      }
    }
    
    // Add completed filter
    if (type === 'completed') {
      const completedCondition = " AND r.status = 'completed'";
      if (whereClause) {
        whereClause += completedCondition;
      } else {
        whereClause = ' WHERE' + completedCondition.substring(5); // Remove ' AND'
      }
    }
    
    const result = await pool.query(`
      SELECT r.*, 
             COUNT(v.id) as total_vulnerabilities,
             COUNT(CASE WHEN v.severity = 'critical' THEN 1 END) as critical,
             COUNT(CASE WHEN v.severity = 'high' THEN 1 END) as high,
             COUNT(CASE WHEN v.severity = 'medium' THEN 1 END) as medium,
             COUNT(CASE WHEN v.severity = 'low' THEN 1 END) as low,
             COUNT(CASE WHEN v.severity = 'info' THEN 1 END) as info,
             CASE 
               WHEN r.title ILIKE 'Re-test:%' OR r.title ILIKE 'Retest:%' OR r.status = 'retest' 
               THEN true 
               ELSE false 
             END as is_retest
      FROM reports r
      LEFT JOIN vulnerabilities v ON r.id = v.report_id
      ${whereClause}
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `, queryParams);

    const reports = result.rows.map(row => ({
      ...row,
      status: row.status || 'draft', // Ensure status has a default value
      vulnerabilities_count: {
        total: parseInt(row.total_vulnerabilities) || 0,
        critical: parseInt(row.critical) || 0,
        high: parseInt(row.high) || 0,
        medium: parseInt(row.medium) || 0,
        low: parseInt(row.low) || 0,
        info: parseInt(row.info) || 0
      }
    }));

    res.json({ data: reports, success: true });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
};

// Get report by ID - Enhanced for temporary projects
const getReportById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle temporary projects with enhanced mock data
    if (isTempId(id)) {
      const mockReport = {
        id: id,
        title: 'Temporary Project',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        preparer: 'User',
        reviewer: 'Reviewer',
        preparer_email: '',
        reviewer_email: '',
        scope: [],
        status: 'draft',
        version: '1.0',
        version_history: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isTemporary: true
      };
      return res.json({ data: mockReport, success: true, isTemporary: true });
    }
    
    // Validate UUID format for regular IDs, but allow "export" to pass through
    if (id !== 'export' && !isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid ID format', success: false });
    }
    
    const result = await pool.query(`
      SELECT r.*,
             CASE 
               WHEN r.title ILIKE 'Re-test:%' OR r.title ILIKE 'Retest:%' OR r.status = 'retest' 
               THEN true 
               ELSE false 
             END as is_retest
      FROM reports r 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found', success: false });
    }

    const report = {
      ...result.rows[0],
      status: result.rows[0].status || 'draft' // Ensure status has a default value
    };

    res.json({ data: report, success: true });
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
};

// Create report - Ensure draft status is set by default
const createReport = async (req, res) => {
  try {
    const { title, start_date, end_date, preparer, reviewer, preparer_email, reviewer_email, scope, status, version = '1.0', version_history } = req.body;
    const id = uuidv4();
    const created_by = req.user.id;
    
    // Ensure status defaults to 'draft' if not provided
    const projectStatus = status || 'draft';

    // Ensure scope is properly formatted JSON
    let scopeJson = scope;
    if (typeof scope === 'string') {
      try {
        scopeJson = JSON.parse(scope);
      } catch (e) {
        scopeJson = scope;
      }
    }

    const result = await pool.query(`
      INSERT INTO reports (id, title, start_date, end_date, preparer, reviewer, preparer_email, reviewer_email, scope, status, version, version_history, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      RETURNING *
    `, [id, title, start_date, end_date, preparer, reviewer, preparer_email, reviewer_email, JSON.stringify(scopeJson), projectStatus, version, version_history || '', created_by]);

    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
};

// Update report - Fixed to allow temporary project updates
const updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Handle temporary projects - allow updates by storing in localStorage
    if (isTempId(id)) {
      // For temporary projects, we'll return success and let the frontend handle localStorage updates
      return res.json({ 
        data: { id, ...updates }, 
        success: true, 
        isTemporary: true,
        message: 'Temporary project update handled by frontend'
      });
    }
    
    // Validate UUID format for regular IDs
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid ID format', success: false });
    }
    
    // Handle scope JSON field properly
    if (updates.scope) {
      if (typeof updates.scope === 'string') {
        try {
          updates.scope = JSON.parse(updates.scope);
        } catch (e) {
          // If it's already a string, keep it as is
        }
      }
      updates.scope = JSON.stringify(updates.scope);
    }
    
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(updates)];
    
    const result = await pool.query(`
      UPDATE reports 
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `, values);

    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
};

// Delete report - Enhanced to handle temporary projects properly
const deleteReport = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Handle temporary projects - always return success without database operations
    if (isTempId(id)) {
      console.log('Temporary project deletion requested for:', id);
      return res.json({ 
        success: true, 
        message: 'Temporary project deleted successfully',
        isTemporary: true 
      });
    }
    
    // Validate UUID format for regular IDs
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid ID format', success: false });
    }
    
    // First delete all vulnerabilities associated with this report
    await pool.query('DELETE FROM vulnerabilities WHERE report_id = $1', [id]);
    
    // Then delete the report
    await pool.query('DELETE FROM reports WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
};

module.exports = {
  getAllReports,
  getReportById,
  createReport,
  updateReport,
  deleteReport
};
