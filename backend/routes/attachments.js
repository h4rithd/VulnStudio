
const express = require('express');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get attachments by vulnerability ID
router.get('/:vulnerabilityId', async (req, res) => {
  try {
    const { vulnerabilityId } = req.params;
    const result = await pool.query('SELECT * FROM attachments WHERE vulnerability_id = $1', [vulnerabilityId]);
    res.json({ data: result.rows, success: true });
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Create attachment
router.post('/', async (req, res) => {
  try {
    const { vulnerability_id, name, label, data, content_type } = req.body;
    const id = uuidv4();
    const created_by = req.user.id;

    const result = await pool.query(`
      INSERT INTO attachments (id, vulnerability_id, name, label, data, content_type, created_by, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *
    `, [id, vulnerability_id, name, label, data, content_type, created_by]);

    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Create attachment error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Delete attachment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM attachments WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

module.exports = router;
