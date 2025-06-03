import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layouts/MainLayout';
import ProjectWizard from '@/components/project/ProjectWizard';

const NewProject = () => {
  const [isWizardOpen, setIsWizardOpen] = useState(true);
  const navigate = useNavigate();
  
  const handleClose = () => {
    setIsWizardOpen(false);
    navigate('/projects');
  };
  
  return (
    <MainLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-muted-foreground">Start a new security testing project</p>
      </div>
      
      <ProjectWizard 
        isOpen={isWizardOpen} 
        onClose={handleClose}
      />
    </MainLayout>
  );
};

export default NewProject;