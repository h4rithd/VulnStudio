export const htmlToWord = async (
  htmlContent: string,
  options?: {
    headers?: Record<string, string>;
    footers?: Record<string, string>;
    pageTitle?: string;
  }
): Promise<Blob> => {
  try {
    // Need to creae this later
    const wordCompatibleHtml = `
      <!DOCTYPE html>
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word'
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${options?.pageTitle || 'Document'}</title>
        <style>
          body {
            font-family: Calibri, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
          }
          @page {
            size: A4;
            margin: 1in;
          }
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
          }
          table {
            border-collapse: collapse;
            width: 100%;
            page-break-inside: avoid;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          img {
            max-width: 100%;
            height: auto;
          }
          .page-break {
            page-break-before: always;
          }
        </style>
      </head>
      <body>
        ${htmlContent}
      </body>
      </html>
    `;
    
    // Create a downloadable blob with MS Word specific content type
    const blob = new Blob([wordCompatibleHtml], {
      type: 'application/vnd.ms-word;charset=utf-8'
    });
    
    return blob;
  } catch (error) {
    console.error('Error converting HTML to Word:', error);
    throw new Error('Failed to convert to Word document');
  }
};
