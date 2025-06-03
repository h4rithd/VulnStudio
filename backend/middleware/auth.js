
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Function to convert timeout string to seconds
const timeoutToSeconds = (timeout) => {
  const units = {
    'm': 60,
    'h': 3600,
    'd': 86400
  };
  
  const match = timeout.match(/^(\d+)([mhd])$/);
  if (!match) return 86400; // Default to 1 day
  
  const [, value, unit] = match;
  return parseInt(value) * units[unit];
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

// Function to get user roles from database
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

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required', success: false });
  }

  try {
    // Get current session timeout setting
    const sessionTimeout = await getSessionTimeout();
    const timeoutSeconds = timeoutToSeconds(sessionTimeout);
    
    // Verify token with dynamic timeout consideration
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is expired based on current timeout setting
    const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;
    if (tokenAge > timeoutSeconds) {
      return res.status(401).json({ error: 'Session expired', success: false });
    }
    
    // Ensure roles are included in the user object
    let userRoles = decoded.roles || [];
    if (!userRoles || userRoles.length === 0) {
      userRoles = await getUserRoles(decoded.id);
    }
    
    req.user = { ...decoded, roles: userRoles };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired', success: false });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ error: 'Invalid token', success: false });
    } else {
      console.error('Token verification error:', err);
      return res.status(500).json({ error: 'Token verification failed', success: false });
    }
  }
};

module.exports = { authenticateToken };
