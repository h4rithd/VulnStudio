
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Function to convert timeout string to JWT expiry format
const timeoutToJwtExpiry = (timeout) => {
  // JWT library accepts formats like '1h', '24h', '7d'
  return timeout;
};

// Function to get session timeout from settings
const getSessionTimeout = async () => {
  try {
    const result = await pool.query(`
      SELECT value FROM settings WHERE key = 'session_timeout'
    `);
    
    if (result.rows.length > 0) {
      return result.rows[0].value;
    }
    return '24h'; // Default to 1 day
  } catch (error) {
    console.error('Error getting session timeout:', error);
    return '24h'; // Default to 1 day
  }
};

// Function to get user roles
const getUserRoles = async (userId) => {
  try {
    const result = await pool.query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [userId]
    );
    return result.rows.map(row => row.role);
  } catch (error) {
    console.error('Error getting user roles:', error);
    return [];
  }
};

// Sign up
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists', success: false });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    // Create user
    const result = await pool.query(
      'INSERT INTO users (id, email, password, name, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *',
      [userId, email, hashedPassword, name]
    );

    // Check if this is the first user (should be admin)
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const isFirstUser = parseInt(userCount.rows[0].count) === 1;

    // Assign default role
    const defaultRole = isFirstUser ? 'admin' : 'auditor';
    await pool.query(
      'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
      [userId, defaultRole]
    );

    // Get user roles for JWT
    const roles = await getUserRoles(userId);

    // Get session timeout and generate token
    const sessionTimeout = await getSessionTimeout();
    const token = jwt.sign(
      { id: userId, email, name, roles },
      process.env.JWT_SECRET,
      { expiresIn: timeoutToJwtExpiry(sessionTimeout) }
    );

    res.json({
      data: { user: result.rows[0], token, roles },
      success: true
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Sign in
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials', success: false });
    }

    const user = result.rows[0];

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials', success: false });
    }

    // Get user roles for JWT
    const roles = await getUserRoles(user.id);

    // Get session timeout and generate token
    const sessionTimeout = await getSessionTimeout();
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, roles },
      process.env.JWT_SECRET,
      { expiresIn: timeoutToJwtExpiry(sessionTimeout) }
    );

    res.json({
      data: { user, token, roles },
      success: true
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

// Update password
router.post('/update-password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect', success: false });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ error: 'Internal server error', success: false });
  }
});

module.exports = router;
