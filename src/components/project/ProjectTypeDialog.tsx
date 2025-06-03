
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Cloud, Database, HardDrive } from 'lucide-react';

interface ProjectTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (isTemporary: boolean) => void;
  projectTitle?: string;
}

export const ProjectTypeDialog = ({ isOpen, onClose, onConfirm, projectTitle }: ProjectTypeDialogProps) => {
  const [selectedType, setSelectedType] = useState<'temp' | 'cloud' | null>(null);

  const handleConfirm = () => {
    if (selectedType) {
      onConfirm(selectedType === 'temp');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Choose Import Type</DialogTitle>
          <DialogDescription>
            How would you like to import "{projectTitle}"?
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div 
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedType === 'temp' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedType('temp')}
          >
            <div className="flex items-center gap-3">
              <HardDrive className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Temporary Project</h3>
                  <Badge variant="outline" className="bg-[#9B2808]/10 text-[#9B2808] border-none">
                    Browser Storage
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Store in browser only. Fast access, but data may be lost if you clear browser data.
                </p>
              </div>
            </div>
          </div>

          <div 
            className={`border rounded-lg p-4 cursor-pointer transition-all ${
              selectedType === 'cloud' ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
            }`}
            onClick={() => setSelectedType('cloud')}
          >
            <div className="flex items-center gap-3">
              <Cloud className="h-6 w-6 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Cloud Project</h3>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-none">
                    Database
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Store in remote database. Permanent storage, accessible from any device.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedType}>
            Import as {selectedType === 'temp' ? 'Temporary' : 'Cloud'} Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
