
const express = require('express');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Export vulndb - Fixed route path
router.get('/export', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vulndb ORDER BY created_at DESC');
    
    const exportData = {
      vulndb: result.rows,
      exported_at: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="vulndb_export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Export vulndb error:', error);
    res.status(500).json({ error: 'Export failed', success: false });
  }
});

// Search vulndb
router.get('/search', async (req, res) => {
  try {
    const { search_term, limit = 10 } = req.query;
    const result = await pool.query(`
      SELECT * FROM vulndb 
      WHERE title ILIKE $1 OR background ILIKE $1 OR details ILIKE $1 
      LIMIT $2
    `, [`%${search_term}%`, limit]);
    
    res.json({ data: result.rows, success: true });
  } catch (error) {
    console.error('Search vulndb error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Get all vulndb entries
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vulndb ORDER BY created_at DESC');
    res.json({ data: result.rows, success: true });
  } catch (error) {
    console.error('Get vulndb error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Get vulndb by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid ID format', success: false });
    }
    
    const result = await pool.query('SELECT * FROM vulndb WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'VulnDB entry not found', success: false });
    }

    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Get vulndb entry error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Create vulndb entry
router.post('/', async (req, res) => {
  try {
    const { title, description, severity, impact, recommendation, references, vulnerability_id, cvss_score } = req.body;
    const id = uuidv4();
    const created_by = req.user.id;

    const result = await pool.query(`
      INSERT INTO vulndb (id, title, background, details, remediation, ref_links, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `, [id, title, description || '', impact || '', recommendation || '', JSON.stringify(references || []), created_by]);

    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Create vulndb entry error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Update vulndb entry
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, severity, impact, recommendation, references, vulnerability_id, cvss_score } = req.body;

    const result = await pool.query(`
      UPDATE vulndb 
      SET title = $2, background = $3, details = $4, remediation = $5, ref_links = $6, updated_at = NOW()
      WHERE id = $1 
      RETURNING *
    `, [id, title, description || '', impact || '', recommendation || '', JSON.stringify(references || [])]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'VulnDB entry not found', success: false });
    }

    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Update vulndb entry error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Delete vulndb entry
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM vulndb WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete vulndb entry error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Import vulndb
router.post('/import', async (req, res) => {
  try {
    const { vulndb } = req.body;
    const created_by = req.user.id;

    if (vulndb && vulndb.length > 0) {
      for (const entry of vulndb) {
        const newId = uuidv4();
        await pool.query(`
          INSERT INTO vulndb (id, title, background, details, remediation, ref_links, created_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [newId, entry.title, entry.background, entry.details, entry.remediation, JSON.stringify(entry.ref_links || []), created_by]);
      }
    }

    res.json({ success: true, message: 'VulnDB import completed successfully' });
  } catch (error) {
    console.error('Import vulndb error:', error);
    res.status(500).json({ error: 'Import failed', success: false });
  }
});

module.exports = router;
