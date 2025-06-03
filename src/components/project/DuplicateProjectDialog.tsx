
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, RefreshCcw } from 'lucide-react';

interface ProjectWithVulnerabilities {
  id: string;
  title: string;
  version: string;
  [key: string]: any;
}

interface DuplicateProjectDialogProps {
  project: ProjectWithVulnerabilities | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (projectTitle: string, version: string, type: 'duplicate' | 'retest') => void;
  type: 'duplicate' | 'retest';
}

export const DuplicateProjectDialog: React.FC<DuplicateProjectDialogProps> = ({
  project,
  isOpen,
  onClose,
  onConfirm,
  type
}) => {
  const [projectTitle, setProjectTitle] = useState('');
  const [version, setVersion] = useState('');

  React.useEffect(() => {
    if (project && isOpen) {
      const baseTitle = project.title.replace(/^(Copy of |Re-test:\s*)/g, '');
      
      const defaultTitle = type === 'retest'
        ? `Re-test: ${baseTitle}`
        : `Copy of ${baseTitle}`;
      
      setProjectTitle(defaultTitle);
      setVersion(project.version);
    }
  }, [project, isOpen, type]);

  const handleConfirm = () => {
    onConfirm(projectTitle, version, type);
    onClose();
  };

  const getDescription = () => {
    if (type === 'retest') {
      return 'Create a new project for re-testing with all the same vulnerabilities. This will be marked as a retest project.';
    }
    return 'Create an exact copy of the project and all its vulnerabilities.';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'retest' ? (
              <>
                <RefreshCcw className="h-5 w-5" />
                Create Re-test Project
              </>
            ) : (
              <>
                <Copy className="h-5 w-5" />
                Duplicate Project
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-title">Project Title</Label>
            <Input
              id="project-title"
              value={projectTitle}
              onChange={(e) => setProjectTitle(e.target.value)}
              placeholder="Enter project title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="version">Version</Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="Enter version"
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={!projectTitle.trim() || !version.trim()}
          >
            {type === 'retest' ? 'Create Re-test' : 'Duplicate Project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
