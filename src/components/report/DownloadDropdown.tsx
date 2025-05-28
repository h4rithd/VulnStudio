import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileDown, FileText, FileCode, ChevronDown, Download, FileType, Archive, FileJson } from 'lucide-react';

interface DownloadDropdownProps {
  onDownload: (format: 'html' | 'markdown' | 'pdf' | 'word' | 'zip' | 'json') => void;
}

export const DownloadDropdown: React.FC<DownloadDropdownProps> = ({ onDownload }) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button 
        onClick={() => onDownload('zip')} 
        className="flex gap-1"
        variant="outline"
      >
        <Archive className="h-4 w-4" /> 
        Export Project
      </Button>
      <Button 
        onClick={() => onDownload('pdf')} 
        className="flex gap-1"
        variant="secondary"
      >
        <FileType className="h-4 w-4" /> 
        Download PDF
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            <FileDown className="mr-2 h-4 w-4" />
            Other Formats
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => onDownload('word')}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Download Word</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownload('html')}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Download HTML</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownload('markdown')}>
            <FileCode className="mr-2 h-4 w-4" />
            <span>Download Markdown</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDownload('json')}>
            <FileJson className="mr-2 h-4 w-4" />
            <span>Download JSON</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};