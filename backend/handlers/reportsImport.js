const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Enhanced Import functionality with complete vulnerability data mapping
const importData = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Import request received:', {
      body: req.body,
      contentType: req.headers['content-type']
    });

    // Handle different data structures
    let { reports, vulnerabilities, vulndb, project, metadata } = req.body;
    
    // If the body is a project export format
    if (req.body.project && !project) {
      project = req.body.project;
      vulnerabilities = req.body.vulnerabilities || [];
      metadata = req.body.metadata || {};
    }
    
    const created_by = req.user.id;
    let importedReportId = null;

    console.log('Processing import:', {
      hasProject: !!project,
      hasReports: !!reports,
      hasVulnerabilities: !!vulnerabilities,
      vulnCount: vulnerabilities?.length || 0,
      projectTitle: project?.title
    });

    // Helper function to validate and fix status - only allow valid database statuses
    const getValidStatus = (status) => {
      const validStatuses = ['draft', 'review', 'completed', 'archived'];
      if (!status || !validStatuses.includes(status)) {
        return 'draft'; // Default to draft if invalid
      }
      return status;
    };

    // Handle single project import with enhanced vulnerability mapping
    if (project && !reports) {
      const newId = uuidv4();
      importedReportId = newId;
      
      // Determine if this is a retest project based on title
      const isRetestProject = project.title && 
        (project.title.toLowerCase().includes('re-test') || 
         project.title.toLowerCase().includes('retest'));
      
      // Always use a valid status from the database constraint
      let finalStatus = getValidStatus(project.status);
      
      // Ensure retest projects have proper title format
      let finalTitle = project.title || 'Imported Project';
      if (isRetestProject && !finalTitle.toLowerCase().includes('re-test') && !finalTitle.toLowerCase().includes('retest')) {
        finalTitle = `Re-test: ${finalTitle}`;
      }
      
      console.log('Creating project:', { 
        id: newId,
        title: finalTitle, 
        status: finalStatus,
        originalStatus: project.status,
        isRetest: isRetestProject
      });
      
      // Create the project with complete field mapping and valid status
      const insertProjectQuery = `
        INSERT INTO reports (
          id, title, start_date, end_date, preparer, reviewer, 
          preparer_email, reviewer_email, scope, status, version, 
          version_history, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        RETURNING *
      `;
      
      const projectResult = await client.query(insertProjectQuery, [
        newId, 
        finalTitle, 
        project.start_date || null, 
        project.end_date || null, 
        project.preparer || '', 
        project.reviewer || '', 
        project.preparer_email || '', 
        project.reviewer_email || '', 
        JSON.stringify(project.scope || []), 
        finalStatus, 
        project.version || '1.0',
        project.version_history || '',
        created_by
      ]);
      
      const createdProject = projectResult.rows[0];
      console.log('Project created successfully:', createdProject.id);
      
      // Import vulnerabilities with comprehensive data mapping
      if (vulnerabilities && vulnerabilities.length > 0) {
        console.log('Starting vulnerability import for', vulnerabilities.length, 'vulnerabilities');
        
        const insertVulnQuery = `
          INSERT INTO vulnerabilities (
            id, title, severity, cvss_score, cvss_vector, background, details, 
            remediation, ref_links, affected_versions, report_id, vulnerability_id, 
            display_order, current_status, request_response, poc_images, 
            retest_date, retest_result, retest_images, created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
        `;
        
        for (let i = 0; i < vulnerabilities.length; i++) {
          const vuln = vulnerabilities[i];
          const newVulnId = uuidv4();
          
          console.log(`Importing vulnerability ${i + 1}:`, vuln.title);
          
          // Safely handle JSON fields
          const refLinks = Array.isArray(vuln.ref_links) ? vuln.ref_links : 
                          (typeof vuln.ref_links === 'string' && vuln.ref_links ? 
                           JSON.parse(vuln.ref_links) : []);
          
          const affectedVersions = Array.isArray(vuln.affected_versions) ? vuln.affected_versions :
                                  (typeof vuln.affected_versions === 'string' && vuln.affected_versions ? 
                                   JSON.parse(vuln.affected_versions) : []);
          
          const requestResponse = typeof vuln.request_response === 'object' && vuln.request_response ? vuln.request_response :
                                 (typeof vuln.request_response === 'string' && vuln.request_response ? 
                                  JSON.parse(vuln.request_response) : {});
          
          const pocImages = Array.isArray(vuln.poc_images) ? vuln.poc_images :
                           (typeof vuln.poc_images === 'string' && vuln.poc_images ? 
                            JSON.parse(vuln.poc_images) : []);
          
          const retestImages = Array.isArray(vuln.retest_images) ? vuln.retest_images :
                              (typeof vuln.retest_images === 'string' && vuln.retest_images ? 
                               JSON.parse(vuln.retest_images) : []);
          
          try {
            await client.query(insertVulnQuery, [
              newVulnId,
              vuln.title || '',
              vuln.severity || 'medium',
              parseFloat(vuln.cvss_score) || 0.0,
              vuln.cvss_vector || '',
              vuln.background || '',
              vuln.details || '',
              vuln.remediation || '',
              JSON.stringify(refLinks),
              JSON.stringify(affectedVersions),
              newId, // Use the new project ID
              vuln.vulnerability_id || null,
              parseInt(vuln.display_order) || i + 1,
              Boolean(vuln.current_status),
              JSON.stringify(requestResponse),
              JSON.stringify(pocImages),
              vuln.retest_date || null,
              vuln.retest_result || null,
              JSON.stringify(retestImages),
              created_by
            ]);
            console.log(`Vulnerability ${i + 1} imported successfully`);
          } catch (vulnError) {
            console.error(`Error importing vulnerability ${i + 1}:`, vulnError);
            throw vulnError;
          }
        }
        
        console.log('All vulnerabilities imported successfully');
      }
    }

    // Handle bulk import with enhanced processing using valid statuses only
    if (reports && reports.length > 0) {
      for (const report of reports) {
        const newId = uuidv4();
        if (!importedReportId) importedReportId = newId;
        
        const isRetestProject = report.title && 
          (report.title.toLowerCase().includes('re-test') || 
           report.title.toLowerCase().includes('retest'));
        
        let finalStatus = getValidStatus(report.status);
        let finalTitle = report.title;
        
        if (isRetestProject && !finalTitle.toLowerCase().includes('re-test') && !finalTitle.toLowerCase().includes('retest')) {
          finalTitle = `Re-test: ${finalTitle}`;
        }
        
        await client.query(`
          INSERT INTO reports (id, title, start_date, end_date, preparer, reviewer, preparer_email, reviewer_email, scope, status, version, version_history, created_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [newId, finalTitle, report.start_date, report.end_date, report.preparer, report.reviewer, report.preparer_email, report.reviewer_email, JSON.stringify(report.scope || []), finalStatus, report.version || '1.0', report.version_history || '', created_by]);
      }
    }

    // Import vulnerabilities for bulk format with enhanced field handling
    if (vulnerabilities && vulnerabilities.length > 0 && !project) {
      for (const vuln of vulnerabilities) {
        const newId = uuidv4();
        
        // Process JSON fields safely
        const refLinks = typeof vuln.ref_links === 'string' ? JSON.parse(vuln.ref_links || '[]') : (vuln.ref_links || []);
        const affectedVersions = typeof vuln.affected_versions === 'string' ? JSON.parse(vuln.affected_versions || '[]') : (vuln.affected_versions || []);
        const requestResponse = typeof vuln.request_response === 'string' ? JSON.parse(vuln.request_response || '{}') : (vuln.request_response || {});
        const pocImages = typeof vuln.poc_images === 'string' ? JSON.parse(vuln.poc_images || '[]') : (vuln.poc_images || []);
        const retestImages = typeof vuln.retest_images === 'string' ? JSON.parse(vuln.retest_images || '[]') : (vuln.retest_images || []);
        
        await client.query(`
          INSERT INTO vulnerabilities (id, title, severity, cvss_score, cvss_vector, background, details, remediation, ref_links, affected_versions, report_id, vulnerability_id, display_order, current_status, request_response, poc_images, retest_date, retest_result, retest_images, created_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [newId, vuln.title, vuln.severity, vuln.cvss_score, vuln.cvss_vector, vuln.background, vuln.details, vuln.remediation, JSON.stringify(refLinks), JSON.stringify(affectedVersions), vuln.report_id, vuln.vulnerability_id, vuln.display_order || 0, vuln.current_status || false, JSON.stringify(requestResponse), JSON.stringify(pocImages), vuln.retest_date, vuln.retest_result, JSON.stringify(retestImages), created_by]);
      }
    }

    // Import vulndb entries
    if (vulndb && vulndb.length > 0) {
      for (const entry of vulndb) {
        const newId = uuidv4();
        await client.query(`
          INSERT INTO vulndb (id, title, background, details, remediation, ref_links, created_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
          ON CONFLICT (id) DO NOTHING
        `, [newId, entry.title, entry.background, entry.details, entry.remediation, JSON.stringify(entry.ref_links || []), created_by]);
      }
    }

    await client.query('COMMIT');
    console.log('Import transaction committed successfully');
    
    res.json({ 
      success: true, 
      message: 'Import completed successfully',
      projectId: importedReportId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Import error:', error);
    res.status(500).json({ 
      error: error.message || 'Import failed', 
      success: false,
      details: error.stack
    });
  } finally {
    client.release();
  }
};

module.exports = {
  importData
};
