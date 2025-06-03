
const pool = require('../config/database');

// Export database (excluding user passwords) - Fixed route path
const exportDatabase = async (req, res) => {
  try {
    // Get all reports
    const reportsResult = await pool.query('SELECT * FROM reports ORDER BY created_at DESC');
    
    // Get all vulnerabilities
    const vulnerabilitiesResult = await pool.query('SELECT * FROM vulnerabilities ORDER BY report_id, display_order');
    
    // Get all vulndb entries
    const vulndbResult = await pool.query('SELECT * FROM vulndb ORDER BY created_at DESC');
    
    // Get users without passwords
    const usersResult = await pool.query('SELECT id, name, email, created_at FROM users ORDER BY created_at DESC');
    
    const exportData = {
      reports: reportsResult.rows,
      vulnerabilities: vulnerabilitiesResult.rows,
      vulndb: vulndbResult.rows,
      users: usersResult.rows,
      exported_at: new Date().toISOString()
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="vulnstudio_export.json"');
    res.json(exportData);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed', success: false });
  }
};

module.exports = {
  exportDatabase
};
