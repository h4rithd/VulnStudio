
const express = require('express');
const pool = require('../config/database');
const { authorizeWrite } = require('../middleware/roleAuth');

const router = express.Router();

// Public endpoint - no authentication required for status check
router.get('/database/status', async (req, res) => {
  try {
    // Simple database connectivity test
    const result = await pool.query('SELECT 1 as test');
    res.json({ 
      status: 'connected', 
      success: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database status check failed:', error);
    res.status(500).json({ 
      status: 'disconnected', 
      success: false,
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// All other endpoints require admin authentication
router.get('/database', authorizeWrite, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT key, value, description, created_at, updated_at 
      FROM settings 
      WHERE key LIKE 'db_%' OR key = 'session_timeout'
      ORDER BY key
    `);

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = {
        value: row.value,
        description: row.description,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
    });

    res.json({ data: settings, success: true });
  } catch (error) {
    console.error('Error fetching database settings:', error);
    res.status(500).json({ error: 'Failed to fetch database settings', success: false });
  }
});

router.put('/database', authorizeWrite, async (req, res) => {
  try {
    const { host, port, database, username, password, session_timeout } = req.body;

    // Update or insert settings
    const settings = [
      { key: 'db_host', value: host, description: 'Database host' },
      { key: 'db_port', value: port.toString(), description: 'Database port' },
      { key: 'db_name', value: database, description: 'Database name' },
      { key: 'db_user', value: username, description: 'Database username' },
      { key: 'db_password', value: password, description: 'Database password' },
      { key: 'session_timeout', value: session_timeout, description: 'Session timeout duration' }
    ];

    for (const setting of settings) {
      await pool.query(`
        INSERT INTO settings (key, value, description, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (key) 
        DO UPDATE SET value = $2, description = $3, updated_at = NOW()
      `, [setting.key, setting.value, setting.description]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating database settings:', error);
    res.status(500).json({ error: 'Failed to update database settings', success: false });
  }
});

router.post('/database/test', authorizeWrite, async (req, res) => {
  try {
    const { host, port, database, username, password } = req.body;

    // Test database connection with provided settings
    const { Pool } = require('pg');
    const testPool = new Pool({
      host,
      port,
      database,
      user: username,
      password,
      connectionTimeoutMillis: 5000,
    });

    await testPool.query('SELECT 1');
    await testPool.end();

    res.json({ success: true, message: 'Database connection successful' });
  } catch (error) {
    console.error('Database connection test failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed: ' + error.message 
    });
  }
});

module.exports = router;
