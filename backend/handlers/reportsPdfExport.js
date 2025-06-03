
const PdfService = require('../services/PdfService');

const generateProfessionalPdf = async (req, res) => {
  try {
    const { id: projectId } = req.params;
    const userId = req.user.id;
    const tempProjectData = req.body.tempProjectData || null;

    console.log('Generating professional PDF for project:', projectId);
    console.log('User ID:', userId);
    console.log('Is temporary project:', projectId.startsWith('temp_'));

    // Generate PDF buffer with temp project data if provided
    const pdfBuffer = await PdfService.generatePdf(projectId, userId, tempProjectData);
    
    // Verify we have a valid buffer
    if (!Buffer.isBuffer(pdfBuffer)) {
      throw new Error('Invalid PDF buffer generated');
    }
    
    console.log('PDF buffer generated, size:', pdfBuffer.length, 'bytes');

    // Set response headers for PDF download
    const filename = `Security_Assessment_Report_${projectId}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache');
    
    // Send the PDF buffer directly - DO NOT JSON stringify
    res.end(pdfBuffer, 'binary');

    console.log('Professional PDF sent successfully');
  } catch (error) {
    console.error('Professional PDF generation error:', error);
    
    // Make sure we don't send binary data on error
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message || 'Professional PDF generation failed',
        success: false 
      });
    }
  }
};

module.exports = {
  generateProfessionalPdf
};
