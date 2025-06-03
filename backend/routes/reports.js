const express = require('express');
const pool = require('../config/database');
const { authorizeWrite, authorizeRead } = require('../middleware/roleAuth');
const { v4: uuidv4 } = require('uuid');

// Import handlers for duplicate and export/import functionality
const { duplicateProject } = require('../handlers/reportsDuplicate');
const { exportDatabase } = require('../handlers/reportsExport');
const { importData } = require('../handlers/reportsImport');
const { exportProjectZip } = require('../handlers/reportsZipExport');
const { generateProfessionalPdf } = require('../handlers/reportsPdfExport');

const router = express.Router();

// Helper functions for temporary project handling
const isTempId = (id) => {
  return typeof id === 'string' && id.startsWith('temp_');
};

const isValidUUID = (id) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// GET routes - accessible to both admin and auditor
router.get('/', authorizeRead, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, 
             COALESCE(vc.total, 0) as total_vulnerabilities,
             COALESCE(vc.critical, 0) as critical_vulnerabilities,
             COALESCE(vc.high, 0) as high_vulnerabilities,
             COALESCE(vc.medium, 0) as medium_vulnerabilities,
             COALESCE(vc.low, 0) as low_vulnerabilities,
             COALESCE(vc.info, 0) as info_vulnerabilities
      FROM reports r
      LEFT JOIN (
        SELECT report_id,
               COUNT(*) as total,
               COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical,
               COUNT(CASE WHEN severity = 'high' THEN 1 END) as high,
               COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium,
               COUNT(CASE WHEN severity = 'low' THEN 1 END) as low,
               COUNT(CASE WHEN severity = 'info' THEN 1 END) as info
        FROM vulnerabilities 
        GROUP BY report_id
      ) vc ON r.id = vc.report_id
      ORDER BY r.created_at DESC
    `);

    const reports = result.rows.map(row => ({
      ...row,
      status: row.status || 'draft', // Ensure status has a default value
      vulnerabilities_count: {
        total: parseInt(row.total_vulnerabilities) || 0,
        critical: parseInt(row.critical_vulnerabilities) || 0,
        high: parseInt(row.high_vulnerabilities) || 0,
        medium: parseInt(row.medium_vulnerabilities) || 0,
        low: parseInt(row.low_vulnerabilities) || 0,
        info: parseInt(row.info_vulnerabilities) || 0,
      }
    }));

    res.json({ data: reports, success: true });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports', success: false });
  }
});

router.get('/:id', authorizeRead, async (req, res) => {
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
    
    // Validate UUID format for regular IDs
    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid ID format', success: false });
    }
    
    const result = await pool.query('SELECT * FROM reports WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found', success: false });
    }

    const report = {
      ...result.rows[0],
      status: result.rows[0].status || 'draft' // Ensure status has a default value
    };

    res.json({ data: report, success: true });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report', success: false });
  }
});

// POST, PUT, DELETE routes - admin only
router.post('/', authorizeWrite, async (req, res) => {
  try {
    const {
      title, start_date, end_date, preparer, preparer_email,
      reviewer, reviewer_email, version, version_history, scope, status
    } = req.body;

    const id = uuidv4();
    const created_by = req.user.id;
    
    // Ensure status defaults to 'draft' if not provided
    const projectStatus = status || 'draft';

    const result = await pool.query(`
      INSERT INTO reports (
        id, title, start_date, end_date, preparer, preparer_email,
        reviewer, reviewer_email, version, version_history, scope, status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      id, title, start_date, end_date, preparer, preparer_email,
      reviewer, reviewer_email, version, JSON.stringify(version_history),
      JSON.stringify(scope), projectStatus, created_by
    ]);

    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report', success: false });
  }
});

router.put('/:id', authorizeWrite, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Handle temporary projects - allow updates by returning success
    if (isTempId(id)) {
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

    // Build dynamic update query
    const fields = Object.keys(updates).filter(key => key !== 'id');
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    const values = [id, ...fields.map(field => {
      if (field === 'scope' || field === 'version_history') {
        return JSON.stringify(updates[field]);
      }
      return updates[field];
    })];

    const result = await pool.query(`
      UPDATE reports SET ${setClause}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found', success: false });
    }

    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Error updating report:', error);
    res.status(500).json({ error: 'Failed to update report', success: false });
  }
});

router.delete('/:id', authorizeWrite, async (req, res) => {
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

    // First delete associated vulnerabilities
    await pool.query('DELETE FROM vulnerabilities WHERE report_id = $1', [id]);
    
    // Then delete the report
    const result = await pool.query('DELETE FROM reports WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found', success: false });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report', success: false });
  }
});

// Add missing duplicate, export, and import routes
router.post('/:id/duplicate', authorizeWrite, duplicateProject);
router.get('/export', authorizeWrite, exportDatabase);
router.post('/import', authorizeWrite, importData);
router.get('/:id/export-zip', authorizeWrite, exportProjectZip);
router.post('/:id/download-pdf', authorizeWrite, generateProfessionalPdf);

module.exports = router;
