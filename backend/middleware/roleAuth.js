
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

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

// Role-based authorization middleware
const authorizeRole = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Access token required', success: false });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user roles from database (fallback if not in token)
      let userRoles = decoded.roles || [];
      if (!userRoles || userRoles.length === 0) {
        userRoles = await getUserRoles(decoded.id);
      }
      
      // Check if user has any of the allowed roles
      if (allowedRoles.length > 0 && !userRoles.some(role => allowedRoles.includes(role))) {
        return res.status(403).json({ 
          error: 'Insufficient permissions for this operation', 
          success: false,
          requiredRoles: allowedRoles,
          userRoles: userRoles
        });
      }

      req.user = { ...decoded, roles: userRoles };
      next();
    } catch (err) {
      console.error('Role authorization error:', err);
      return res.status(403).json({ error: 'Invalid or expired token', success: false });
    }
  };
};

// Middleware to check write permissions (admin only)
const authorizeWrite = authorizeRole(['admin']);

// Middleware to check admin permissions
const authorizeAdmin = authorizeRole(['admin']);

// Middleware to check read permissions (admin and auditor)
const authorizeRead = authorizeRole(['admin', 'auditor']);

module.exports = {
  authorizeRole,
  authorizeWrite,
  authorizeAdmin,
  authorizeRead
};
