
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all users
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at,
             COALESCE(ur.role, 'auditor') as role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      ORDER BY u.created_at DESC
    `);
    
    res.json({ data: result.rows, success: true });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.created_at,
             COALESCE(ur.role, 'auditor') as role
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      WHERE u.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found', success: false });
    }

    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Filter out any fields that don't exist in the users table
    const allowedFields = ['name', 'email'];
    const filteredUpdates = {};
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    });
    
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update', success: false });
    }
    
    const setClause = Object.keys(filteredUpdates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [id, ...Object.values(filteredUpdates)];
    
    const result = await pool.query(`
      UPDATE users 
      SET ${setClause}
      WHERE id = $1 
      RETURNING *
    `, values);

    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Update user role
router.put('/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Check if user_roles table has created_at and updated_at columns
    const tableInfo = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_roles' 
      AND table_schema = 'public'
    `);
    
    const columns = tableInfo.rows.map(row => row.column_name);
    const hasTimestamps = columns.includes('created_at') && columns.includes('updated_at');

    if (hasTimestamps) {
      await pool.query(`
        INSERT INTO user_roles (user_id, role, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        ON CONFLICT (user_id) 
        DO UPDATE SET role = $2, updated_at = NOW()
      `, [id, role]);
    } else {
      await pool.query(`
        INSERT INTO user_roles (user_id, role)
        VALUES ($1, $2)
        ON CONFLICT (user_id) 
        DO UPDATE SET role = $2
      `, [id, role]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Create admin user - Fixed to handle missing timestamp columns
router.post('/admin', async (req, res) => {
  try {
    const { email, password, name, role = 'admin' } = req.body;

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists', success: false });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user - only insert fields that exist in the table
    const result = await pool.query(
      'INSERT INTO users (id, email, password, name, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [userId, email, hashedPassword, name]
    );

    // Check if user_roles table has timestamp columns
    const tableInfo = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_roles' 
      AND table_schema = 'public'
    `);
    
    const columns = tableInfo.rows.map(row => row.column_name);
    const hasTimestamps = columns.includes('created_at') && columns.includes('updated_at');

    // Assign role based on available columns
    if (hasTimestamps) {
      await pool.query(
        'INSERT INTO user_roles (user_id, role, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())',
        [userId, role]
      );
    } else {
      await pool.query(
        'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
        [userId, role]
      );
    }

    res.json({ data: result.rows[0], success: true });
  } catch (error) {
    console.error('Create admin user error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Get session timeout setting
router.get('/settings/session-timeout', async (req, res) => {
  try {
    // Default to 1 day (24 hours) if no setting exists
    const defaultTimeout = '24h';
    
    // Try to get from a settings table if it exists, otherwise return default
    try {
      const result = await pool.query(`
        SELECT value FROM settings WHERE key = 'session_timeout'
      `);
      
      if (result.rows.length > 0) {
        res.json({ data: { timeout: result.rows[0].value }, success: true });
      } else {
        res.json({ data: { timeout: defaultTimeout }, success: true });
      }
    } catch (tableError) {
      // Settings table doesn't exist, return default
      res.json({ data: { timeout: defaultTimeout }, success: true });
    }
  } catch (error) {
    console.error('Get session timeout error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Update session timeout setting
router.put('/settings/session-timeout', async (req, res) => {
  try {
    const { timeout } = req.body;
    
    // Validate timeout format (e.g., '1h', '24h', '7d')
    const validTimeouts = ['15m', '30m', '1h', '2h', '6h', '12h', '24h', '7d', '30d'];
    if (!validTimeouts.includes(timeout)) {
      return res.status(400).json({ error: 'Invalid timeout format', success: false });
    }

    // Try to create settings table if it doesn't exist
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `);
      
      // Insert or update the session timeout setting
      await pool.query(`
        INSERT INTO settings (key, value) 
        VALUES ('session_timeout', $1)
        ON CONFLICT (key) 
        DO UPDATE SET value = $1, updated_at = NOW()
      `, [timeout]);
      
      res.json({ success: true });
    } catch (settingsError) {
      console.error('Settings table error:', settingsError);
      res.status(500).json({ error: 'Failed to update session timeout', success: false });
    }
  } catch (error) {
    console.error('Update session timeout error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

module.exports = router;
