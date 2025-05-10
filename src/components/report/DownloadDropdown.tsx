
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, FileText, FileCode, ChevronDown } from 'lucide-react';

interface DownloadDropdownProps {
  onDownload: (format: 'html' | 'markdown' | 'pdf') => void;
}

export const DownloadDropdown: React.FC<DownloadDropdownProps> = ({ onDownload }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <FileDown className="mr-2 h-4 w-4" />
          Download Report
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onDownload('html')}>
          <FileText className="mr-2 h-4 w-4" />
          <span>HTML Format</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onDownload('markdown')}>
          <FileCode className="mr-2 h-4 w-4" />
          <span>Markdown Format</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
