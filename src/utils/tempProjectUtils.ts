
export const isTemporaryProject = (projectId: string): boolean => {
  return projectId.startsWith('temp_');
};

export const generateTempId = (prefix: string = 'temp'): string => {
  return `${prefix}_${Math.random().toString(36).substr(2, 16)}`;
};

export const generateVulnerabilityId = (projectTitle: string, severity: string, order: number): string => {
  const projectAbbrev = projectTitle
    .replace(/^(Re-test:|Retest:)\s*/i, '') 
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 3);
  
  const severityCode = severity.charAt(0).toUpperCase();
  const orderPadded = String(order).padStart(2, '0');
  
  return `${projectAbbrev}-${severityCode}-${orderPadded}`;
};

export const saveTempProject = (project: any): void => {
  const tempProjectsJSON = localStorage.getItem('tempProjects');
  const tempProjects = tempProjectsJSON ? JSON.parse(tempProjectsJSON) : [];
  tempProjects.push(project);
  localStorage.setItem('tempProjects', JSON.stringify(tempProjects));
};

export const saveTempVulnerabilities = (projectId: string, vulnerabilities: any[]): void => {
  const vulnKey = `tempVulnerabilities_${projectId}`;
  localStorage.setItem(vulnKey, JSON.stringify(vulnerabilities));
};

export const getTempProject = (projectId: string): any | null => {
  const tempProjectsJSON = localStorage.getItem('tempProjects');
  if (tempProjectsJSON) {
    const tempProjects = JSON.parse(tempProjectsJSON);
    return tempProjects.find((p: any) => p.id === projectId) || null;
  }
  return null;
};

export const getTempVulnerabilities = (projectId: string): any[] => {
  const vulnKey = `tempVulnerabilities_${projectId}`;
  const vulnJSON = localStorage.getItem(vulnKey);
  return vulnJSON ? JSON.parse(vulnJSON) : [];
};

export const updateTempProject = (projectId: string, updates: any): boolean => {
  try {
    const tempProjectsJSON = localStorage.getItem('tempProjects');
    if (tempProjectsJSON) {
      const tempProjects = JSON.parse(tempProjectsJSON);
      const projectIndex = tempProjects.findIndex((p: any) => p.id === projectId);
      
      if (projectIndex !== -1) {
        tempProjects[projectIndex] = { ...tempProjects[projectIndex], ...updates };
        localStorage.setItem('tempProjects', JSON.stringify(tempProjects));
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error updating temp project:', error);
    return false;
  }
};

export const updateTempVulnerability = (projectId: string, vulnerabilityId: string, updates: any): boolean => {
  try {
    const vulnerabilities = getTempVulnerabilities(projectId);
    const vulnIndex = vulnerabilities.findIndex((v: any) => v.id === vulnerabilityId);
    
    if (vulnIndex !== -1) {
      vulnerabilities[vulnIndex] = { ...vulnerabilities[vulnIndex], ...updates };
      saveTempVulnerabilities(projectId, vulnerabilities);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating temp vulnerability:', error);
    return false;
  }
};

export const deleteTempVulnerability = (projectId: string, vulnerabilityId: string): boolean => {
  try {
    const vulnerabilities = getTempVulnerabilities(projectId);
    const updatedVulnerabilities = vulnerabilities.filter((v: any) => v.id !== vulnerabilityId);
    saveTempVulnerabilities(projectId, updatedVulnerabilities);
    return true;
  } catch (error) {
    console.error('Error deleting temp vulnerability:', error);
    return false;
  }
};

export const generateMissingVulnerabilityIds = (projectId: string): boolean => {
  try {
    const project = getTempProject(projectId);
    const vulnerabilities = getTempVulnerabilities(projectId);
    
    if (!project || !vulnerabilities.length) return false;
    
    let hasChanges = false;
    const updatedVulnerabilities = vulnerabilities.map((vuln: any, index: number) => {
      if (!vuln.vulnerability_id) {
        const newId = generateVulnerabilityId(project.title, vuln.severity || 'medium', index + 1);
        hasChanges = true;
        return { ...vuln, vulnerability_id: newId };
      }
      return vuln;
    });
    
    if (hasChanges) {
      saveTempVulnerabilities(projectId, updatedVulnerabilities);
    }
    
    return hasChanges;
  } catch (error) {
    console.error('Error generating vulnerability IDs:', error);
    return false;
  }
};

export const deleteTempProject = (projectId: string): boolean => {
  try {
    const tempProjectsJSON = localStorage.getItem('tempProjects');
    if (tempProjectsJSON) {
      const tempProjects = JSON.parse(tempProjectsJSON);
      const updatedProjects = tempProjects.filter((p: any) => p.id !== projectId);
      localStorage.setItem('tempProjects', JSON.stringify(updatedProjects));
    }
    
    const vulnKey = `tempVulnerabilities_${projectId}`;
    localStorage.removeItem(vulnKey);
    
    return true;
  } catch (error) {
    console.error('Error deleting temp project:', error);
    return false;
  }
};
