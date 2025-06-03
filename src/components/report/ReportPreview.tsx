import React from 'react';
import { formatRequestResponse } from '@/components/vulnerability/utils/search-utils';
import { Vulnerability } from '@/components/vulnerability/types/vulnerability.types';
import { Badge } from '@/components/ui/badge';

interface Project {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  preparer: string;
  reviewer: string;
  status: string;
  version: string;
  version_history?: string;
  scope?: any[];
  created_at: string;
}

interface ReportPreviewProps {
  project: Project;
  vulnerabilities: Vulnerability[];
}

// Define severity order for sorting
const SEVERITY_ORDER: Record<string, number> = {
  'critical': 1,
  'high': 2,
  'medium': 3,
  'low': 4,
  'info': 5
};

export const ReportPreview: React.FC<ReportPreviewProps> = ({ project, vulnerabilities }) => {
  // Sort vulnerabilities by severity
  const sortedVulnerabilities = [...vulnerabilities].sort((a, b) => {
    // Sort by severity first
    const severityComparison = 
      (SEVERITY_ORDER[a.severity.toLowerCase()] || 0) - 
      (SEVERITY_ORDER[b.severity.toLowerCase()] || 0);
    
    // If same severity, use display order or fallback to alphabetical
    if (severityComparison === 0) {
      // Check if both vulnerabilities have display_order property
      const aOrder = a.display_order !== undefined ? Number(a.display_order) : 0;
      const bOrder = b.display_order !== undefined ? Number(b.display_order) : 0;
      return aOrder - bOrder;
    }
    
    return severityComparison;
  });
  
  // Group vulnerabilities by severity for the summary
  const sevCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0
  };
  
  sortedVulnerabilities.forEach(vuln => {
    const sev = vuln.severity.toLowerCase();
    if (sev in sevCounts) {
      sevCounts[sev as keyof typeof sevCounts]++;
    }
  });
  
  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-severity-critical';
      case 'high':
        return 'bg-severity-high';
      case 'medium':
        return 'bg-severity-medium';
      case 'low':
        return 'bg-severity-low';
      case 'info':
      default:
        return 'bg-severity-info';
    }
  };
  
  // Function to render affected hosts (versions)
  const renderAffectedVersions = (affectedVersions?: any[]) => {
    if (!affectedVersions || affectedVersions.length === 0) return <p>None specified</p>;
    
    return (
      <ul className="list-disc pl-5">
        {affectedVersions.map((version, i) => (
          <li key={i}>{version.name || version.value || JSON.stringify(version)}</li>
        ))}
      </ul>
    );
  };

  // Function to render request/response data with better code styling
  const renderRequestResponse = (requestResponse: any) => {
    if (!requestResponse) return null;
    
    // Handle object format with request/response properties
    if (typeof requestResponse === 'object' && (requestResponse.request || requestResponse.response)) {
      return (
        <div className="space-y-4">
          {requestResponse.request && (
            <div>
              <h5 className="font-medium text-sm mb-1">Request:</h5>
              <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono whitespace-pre-wrap border">
                {requestResponse.request}
              </pre>
            </div>
          )}
          {requestResponse.response && (
            <div>
              <h5 className="font-medium text-sm mb-1">Response:</h5>
              <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono whitespace-pre-wrap border">
                {requestResponse.response}
              </pre>
            </div>
          )}
        </div>
      );
    }
    
    // Handle string format (legacy)
    return (
      <pre className="bg-muted p-3 rounded-md overflow-x-auto text-xs font-mono whitespace-pre-wrap border">
        {formatRequestResponse(requestResponse)}
      </pre>
    );
  };
  
  // Function to render re-test results
  const renderRetestResults = (vuln: Vulnerability) => {
    if (!vuln.current_status || !vuln.retest_result) return null;
    
    return (
      <div className="mb-4 border-t pt-4 mt-4">
        <h4 className="font-semibold mb-2">Re-Test Results:</h4>
        <div className="space-y-2">
          {vuln.retest_date && (
            <p><span className="font-medium">Re-Test Date:</span> {new Date(vuln.retest_date).toLocaleDateString()}</p>
          )}
          
          <div className="whitespace-pre-wrap">{vuln.retest_result}</div>
          
          {vuln.retest_images && vuln.retest_images.length > 0 && (
            <div className="mt-2">
              <p className="font-medium mb-1">Re-Test Evidence:</p>
              <div className="grid grid-cols-1 gap-4">
                {vuln.retest_images.map((img: any, i: number) => (
                  <figure key={i} className="border p-2 rounded">
                    <img 
                      src={img.data} 
                      alt={img.label || `Re-Test ${i+1}`} 
                      className="max-h-80 object-contain mx-auto border rounded" 
                    />
                    <figcaption className="text-sm text-center mt-2 text-muted-foreground">
                      {img.label || img.name || `Re-Test Figure ${i+1}`}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">{project.title}</h1>
        <h2 className="text-2xl">Security Assessment Report</h2>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p><span className="font-bold">Start Date:</span> {project.start_date}</p>
          <p><span className="font-bold">End Date:</span> {project.end_date}</p>
          <p><span className="font-bold">Prepared By:</span> {project.preparer}</p>
        </div>
        <div>
          <p><span className="font-bold">Reviewed By:</span> {project.reviewer}</p>
          <p><span className="font-bold">Version:</span> {project.version}</p>
          <p><span className="font-bold">Report Date:</span> {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {project.version_history && (
        <div className="mb-8">
          <p className="font-bold">Version History:</p>
          <p className="whitespace-pre-wrap">{project.version_history}</p>
        </div>
      )}
      
      {/* Table of Contents */}
      <div className="mb-8 p-4 border rounded-md bg-muted/30">
        <h2 className="text-xl font-bold mb-2">Table of Contents</h2>
        <ol className="list-decimal list-inside">
          <li>Executive Summary</li>
          <li>Findings Summary</li>
          <li>
            Vulnerabilities
            <ol className="list-decimal list-inside ml-4 mt-2">
              {sortedVulnerabilities.map((vuln, index) => (
                <li key={vuln.id} className="mb-1">
                  {vuln.vulnerability_id || vuln.title}
                </li>
              ))}
            </ol>
          </li>
        </ol>
      </div>
      
      <h2 className="text-xl font-bold mb-4">Findings Summary</h2>
      <div className="grid grid-cols-5 gap-4 mb-8 text-white text-center">
        <div className={`p-4 rounded-md bg-severity-critical`}>
          <div className="text-2xl font-bold">{sevCounts.critical}</div>
          <div>Critical</div>
        </div>
        <div className={`p-4 rounded-md bg-severity-high`}>
          <div className="text-2xl font-bold">{sevCounts.high}</div>
          <div>High</div>
        </div>
        <div className={`p-4 rounded-md bg-severity-medium`}>
          <div className="text-2xl font-bold">{sevCounts.medium}</div>
          <div>Medium</div>
        </div>
        <div className={`p-4 rounded-md bg-severity-low`}>
          <div className="text-2xl font-bold">{sevCounts.low}</div>
          <div>Low</div>
        </div>
        <div className={`p-4 rounded-md bg-severity-info`}>
          <div className="text-2xl font-bold">{sevCounts.info}</div>
          <div>Info</div>
        </div>
      </div>
      
      <h2 className="text-xl font-bold mb-4">Vulnerabilities</h2>
      {sortedVulnerabilities.length > 0 ? (
        <div className="space-y-6">
          {sortedVulnerabilities.map((vuln, index) => (
            <div key={vuln.id} className="border rounded-md p-4">
              <div className="flex justify-between items-center pb-2 border-b mb-4">
                <h3 className="text-lg font-medium">
                  {/* {index + 1}. {vuln.vulnerability_id ? <span className="font-mono">{vuln.vulnerability_id}</span> : ''} {vuln.title} */}
                  {vuln.vulnerability_id ? <span className="font-medium">{vuln.vulnerability_id}</span> : ''}: {vuln.title}
                  {vuln.current_status && (
                    <Badge variant="outline" className="ml-2 text-green-600 border-green-600">Resolved</Badge>
                  )}
                </h3>
                <div className={`${getSeverityColor(vuln.severity)} text-white px-2 py-1 rounded text-sm font-medium`}>
                  {vuln.severity.toUpperCase()} ({vuln.cvss_score})
                </div>
              </div>
              
              <div className="mb-4">
                <h4 className="font-semibold mb-1">Background:</h4>
                <p className="whitespace-pre-wrap">{vuln.background || 'N/A'}</p>
              </div>
              
              <div className="mb-4">
                <h4 className="font-semibold mb-1">Affected Hosts/Versions:</h4>
                {renderAffectedVersions(vuln.affected_versions)}
              </div>
              
              <div className="mb-4">
                <h4 className="font-semibold mb-1">Details:</h4>
                <p className="whitespace-pre-wrap">{vuln.details || 'N/A'}</p>
              </div>
              
              {vuln.poc_images && vuln.poc_images.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-1">Proof of Concept:</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {vuln.poc_images.map((img, i) => (
                      <figure key={i} className="border p-2 rounded">
                        <img 
                          src={img.data} 
                          alt={img.label || `PoC ${i+1}`} 
                          className="max-h-80 object-contain mx-auto border rounded" 
                        />
                        <figcaption className="text-sm text-center mt-2 text-muted-foreground">
                          {img.label || img.name || `Figure ${i+1}`}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}
              
              {vuln.request_response && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-1">Request/Response:</h4>
                  {renderRequestResponse(vuln.request_response)}
                </div>
              )}
              
              <div className="mb-4">
                <h4 className="font-semibold mb-1">Remediation:</h4>
                <p className="whitespace-pre-wrap">{vuln.remediation || 'N/A'}</p>
              </div>
              
              {/* Display re-test results for resolved vulnerabilities */}
              {renderRetestResults(vuln)}
              
              {vuln.ref_links && vuln.ref_links.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-1">References:</h4>
                  <ul className="list-disc pl-5">
                    {vuln.ref_links.map((link, i) => (
                      <li key={i}>
                        <a href={link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">No vulnerabilities found for this report.</p>
      )}
    </div>
  );
};