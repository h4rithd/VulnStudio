import React, { useState, useEffect, useRef } from 'react';
import { Search, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Reports } from '@/types/database.types';
import { reportsApi } from '@/utils/api';

interface ProjectSearchProps {
  className?: string;
}

const ProjectSearch: React.FC<ProjectSearchProps> = ({ className }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Reports[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentProjectSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Search function with debounce
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm.length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async () => {
    if (!searchTerm.trim()) return;

    setLoading(true);
    try {
      // Use the reportsApi to search for reports
      const result = await reportsApi.getAll();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to search reports');
      }
      
      // Filter reports based on search term
      const filteredReports = result.data?.filter(report => 
        report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.status.toLowerCase().includes(searchTerm.toLowerCase())
      ) || [];
      
      setResults(filteredReports);
      setIsOpen(true);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = (project: Reports) => {
    // Save to recent searches
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentProjectSearches', JSON.stringify(updated));

    setSearchTerm(project.title);
    setIsOpen(false);
    navigate(`/projects/${project.id}`);
  };

  const handleRecentSearch = (term: string) => {
    setSearchTerm(term);
    setIsOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'review': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
          className="pl-10 pr-12"
        />
        <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          ⌘K
        </kbd>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background rounded-md shadow-lg border border-border max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-medium text-muted-foreground">Projects</div>
              {results.map((project) => (
                <button
                  key={project.id}
                  onClick={() => handleSelectProject(project)}
                  className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-3 group"
                >
                  <FileText className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{project.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {new Date(project.created_at!).toLocaleDateString()}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {project.status}
                  </span>
                </button>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="p-4 text-center text-muted-foreground">No projects found</div>
          ) : (
            recentSearches.length > 0 && (
              <div className="py-2">
                <div className="px-3 py-1 text-xs font-medium text-muted-foreground">Recent Searches</div>
                {recentSearches.map((term, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentSearch(term)}
                    className="w-full px-3 py-2 text-left hover:bg-accent flex items-center gap-3"
                  >
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{term}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default ProjectSearch;