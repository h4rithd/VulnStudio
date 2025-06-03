
import { reportsApi, vulnerabilitiesApi } from '@/utils/api';
import { Database } from '@/types/database.types';

type Report = Database['public']['Tables']['reports']['Row'];
type Vulnerability = Database['public']['Tables']['vulnerabilities']['Row'];

export interface ProjectExportData {
  project: Report;
  vulnerabilities: Vulnerability[];
  metadata: {
    exportedAt: string;
    exportedBy: string;
    version: string;
  };
}

export const exportProject = async (projectId: string, userId: string): Promise<ProjectExportData | null> => {
  try {
    console.log('[export-project] Starting export for project:', projectId);

    // Fetch project data
    const projectResult = await reportsApi.getById(projectId);
    if (!projectResult.success || !projectResult.data) {
      throw new Error(projectResult.error || 'Failed to fetch project data');
    }

    // Fetch vulnerabilities for this project
    const vulnerabilitiesResult = await vulnerabilitiesApi.getByReportId(projectId);
    if (!vulnerabilitiesResult.success) {
      throw new Error(vulnerabilitiesResult.error || 'Failed to fetch vulnerabilities');
    }

    const exportData: ProjectExportData = {
      project: projectResult.data,
      vulnerabilities: vulnerabilitiesResult.data || [],
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
        version: '1.0'
      }
    };

    console.log('[export-project] Export completed successfully');
    return exportData;
  } catch (error) {
    console.error('[export-project] Error during export:', error);
    return null;
  }
};

export const downloadProjectAsJSON = (exportData: ProjectExportData, filename?: string) => {
  try {
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `project-${exportData.project.title}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    console.log('[export-project] JSON download initiated');
  } catch (error) {
    console.error('[export-project] Error downloading JSON:', error);
    throw new Error('Failed to download project as JSON');
  }
};

export const importProjectFromJSON = async (jsonData: ProjectExportData, userId: string): Promise<{ success: boolean; projectId?: string; error?: string }> => {
  try {
    console.log('[export-project] Starting import process');

    // Create new project with imported data
    const projectData = {
      ...jsonData.project,
      created_by: userId,
      // Remove the original ID so a new one is generated
      id: undefined,
      created_at: undefined,
      updated_at: undefined
    };

    const projectResult = await reportsApi.create(projectData);
    if (!projectResult.success || !projectResult.data) {
      throw new Error(projectResult.error || 'Failed to create project');
    }

    const newProjectId = projectResult.data.id;

    // Import vulnerabilities
    for (const vulnerability of jsonData.vulnerabilities) {
      const vulnData = {
        ...vulnerability,
        report_id: newProjectId,
        created_by: userId,
        // Remove the original ID so a new one is generated
        id: undefined,
        created_at: undefined,
        updated_at: undefined
      };

      const vulnResult = await vulnerabilitiesApi.create(vulnData);
      if (!vulnResult.success) {
        console.warn('[export-project] Failed to import vulnerability:', vulnerability.title);
      }
    }

    console.log('[export-project] Import completed successfully');
    return { success: true, projectId: newProjectId };
  } catch (error) {
    console.error('[export-project] Error during import:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to import project'
    };
  }
};
