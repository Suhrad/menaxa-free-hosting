'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import DataTable from '../components/DataTable';
import DashboardLayout from '../components/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardDescription, 
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/app/components/ui';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/app/components/ui/sheet';

import { Search, Shield, ShieldAlert, InfoIcon, Copy, Check, ChevronRight, List, X, Upload } from 'lucide-react';
import { cn } from '../lib/utils';
import { marked } from 'marked';

interface TableOfContentsItem {
  title: string;
  id: string;
  level: number;
}

interface Vulnerability {
  name: string;
  short_description: string;
  detailed_description: string;
  example: string;
  list: string;
  type: 'Smart Contract' | 'Web';
}

interface ChecklistData {
  content: string;
  type: string;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  // Format the code if it's a JSON object
  const formattedCode = useMemo(() => {
    if (language === 'json' && typeof code === 'string') {
      try {
        // Try to parse as JSON and pretty print
        const parsed = JSON.parse(code);
        return JSON.stringify(parsed, null, 2);
      } catch {
        // If not valid JSON, return as is
        return code;
      }
    }
    // For objects that might have been passed directly
    if (typeof code === 'object') {
      return JSON.stringify(code, null, 2);
    }
    return code;
  }, [code, language]);

  return (
    <div className="relative group">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-2 rounded-md bg-slate-800/50 hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <Copy className="h-4 w-4 text-slate-400" />
        )}
      </button>
      <pre className="!mt-0">
        <code className={language ? `language-${language}` : ''}>
          {formattedCode}
        </code>
      </pre>
    </div>
  );
}

export default function VulnerabilitiesPage() {
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });
  const pageSize = 20;
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);
  const [checklistContent, setChecklistContent] = useState<string | null>(null);
  const [loadingChecklist, setLoadingChecklist] = useState(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);
  const [tableOfContents, setTableOfContents] = useState<TableOfContentsItem[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchVulnerabilities = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/vulnerabilities');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setVulnerabilities(data);
      } catch (error) {
        console.error('Error fetching vulnerabilities:', error);
        setError(error instanceof Error ? error.message : 'Failed to load vulnerabilities');
      } finally {
        setLoading(false);
      }
    };

    fetchVulnerabilities();
  }, []);

  useEffect(() => {
    setSelectedVulnerability(null);
  }, [currentPage, searchQuery, selectedType]);

  const fetchChecklistData = async (type: string) => {
    setLoadingChecklist(true);
    setChecklistError(null);
    try {
      const response = await fetch(`/api/vulnerabilities/checklist?type=${type}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setChecklistContent(data.content);
      setSelectedChecklist(type);
    } catch (error) {
      console.error('Error fetching checklist data:', error);
      setChecklistError(error instanceof Error ? error.message : 'Failed to load checklist data');
    } finally {
      setLoadingChecklist(false);
    }
  };

  const getFilteredVulnerabilities = () => {
    return vulnerabilities.filter(vuln => {
      const typeMatch = selectedType === 'all' || vuln.type === selectedType;
      const searchMatch = searchQuery === '' || 
        vuln.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vuln.short_description.toLowerCase().includes(searchQuery.toLowerCase());
      return typeMatch && searchMatch;
    });
  };

  const filteredVulnerabilities = getFilteredVulnerabilities();
  const totalVulnerabilities = filteredVulnerabilities.length;
  const totalPages = Math.ceil(totalVulnerabilities / pageSize);

  // Sort the filtered vulnerabilities
  const sortedVulnerabilities = [...filteredVulnerabilities].sort((a, b) => {
    const key = sortConfig.key as keyof Vulnerability;
    const aValue = a[key];
    const bValue = b[key];
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });

  const paginatedVulnerabilities = sortedVulnerabilities.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getTypeCount = (type: string) => {
    return vulnerabilities.filter(v => v.type === type).length;
  };

  const handleSortChange = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '30%',
      render: (row: Vulnerability) => (
        <span className="text-sm text-slate-300 font-semibold">{row.name}</span>
      ),
      onSort: () => handleSortChange('name'),
      sortDirection: sortConfig.key === 'name' ? sortConfig.direction : undefined
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      width: '20%',
      render: (row: Vulnerability) => (
        <Badge variant={row.type === 'Smart Contract' ? 'purple' : 'info'}>
          {row.type}
        </Badge>
      ),
      onSort: () => handleSortChange('type'),
      sortDirection: sortConfig.key === 'type' ? sortConfig.direction : undefined
    },
    {
      key: 'list',
      label: 'Category',
      sortable: true,
      width: '25%',
      render: (row: Vulnerability) => (
        <span className="text-sm text-slate-300">{row.list}</span>
      ),
      onSort: () => handleSortChange('list'),
      sortDirection: sortConfig.key === 'list' ? sortConfig.direction : undefined
    },
    {
      key: 'short_description',
      label: 'Description',
      sortable: false,
      width: '25%',
      render: (row: Vulnerability) => (
        <span className="text-sm text-slate-400">{row.short_description}</span>
      ),
    },
  ];

  const generateTableOfContents = (content: string): TableOfContentsItem[] => {
    const headings: TableOfContentsItem[] = [];
    const lines = content.split('\n');
    
    lines.forEach(line => {
      // Only match lines that start with exactly two # and not more
      if (line.match(/^##(?!#)\s+/)) {
        const title = line.replace(/^##\s+/, '');
        const id = title.toLowerCase().replace(/[^\w]+/g, '-');
        headings.push({ title, id, level: 2 });
      }
    });
    
    return headings;
  };

  useEffect(() => {
    if (checklistContent) {
      const toc = generateTableOfContents(checklistContent);
      setTableOfContents(toc);
    }
  }, [checklistContent]);

  const processMarkdown = (content: string): string => {
    // First remove any existing ID attributes and unnecessary markup
    content = content.replace(/{id="[^"]*"}/g, '');
    content = content.replace(/{[^}]*}/g, '');
    
    // Ensure proper spacing after bullet points and between sections
    content = content
      // Fix bullet point spacing
      .replace(/^(\s*[-*+])\s*/gm, '$1 ')
      // Ensure proper spacing between sections
      .replace(/\n{3,}/g, '\n\n')
      // Fix numbered list spacing
      .replace(/^(\s*\d+\.)\s*/gm, '$1 ')
      // Fix code block spacing
      .replace(/^```/gm, '\n```')
      // Fix heading spacing and add custom styling for h2
      .replace(/^(#{1,3})\s*(.+?)$/gm, (match, hashes, title) => {
        if (hashes === '##') {
          const id = title.toLowerCase().replace(/[^\w]+/g, '-');
          return `\n## <div id="${id}" class="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">${title}</div>\n`;
        }
        return `\n${hashes} ${title}\n`;
      });
    
    return content;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
            Vulnerabilities
          </h1>
              <p className="text-slate-400 mt-2">
            Track, analyze, and understand security vulnerabilities in Web2 & Web3 applications
          </p>
            </div>
          </div>
          <div className="h-px bg-gradient-to-r from-slate-700/50 via-slate-700 to-slate-700/50 mt-4" />
            </div>

        {/* Info Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-pink-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-indigo-500/20 p-3 shadow-lg">
                      <Shield className="w-6 h-6 text-indigo-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Total Vulnerabilities</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">All security vulnerabilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-indigo-400">{totalVulnerabilities}</div>
                    <p className="text-xs text-slate-400">Across all categories</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-pink-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-purple-500/20 p-3 shadow-lg">
                      <ShieldAlert className="w-6 h-6 text-purple-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Smart Contract</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">Blockchain vulnerabilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-purple-400">{getTypeCount('Smart Contract')}</div>
                    <p className="text-xs text-slate-400">Smart contract security issues</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-cyan-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-blue-500/20 p-3 shadow-lg">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Web</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">Web application vulnerabilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-blue-400">{getTypeCount('Web')}</div>
                    <p className="text-xs text-slate-400">Web security issues</p>
                  </div>
                </CardContent>
              </Card>
            </div>

        {/* Vulnerability Checklists Section */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800/60 rounded-lg overflow-hidden">
            <div className="p-6">
              {/* Header Section */}
              <div className="flex items-center gap-2 mb-6">
                <Shield className="h-5 w-5 text-yellow-500" />
                <h2 className="text-xl font-semibold text-slate-200">Vulnerability Cheatsheet</h2>
              </div>
              <p className="text-sm text-slate-400 mb-6">
                Comprehensive guides and checklists for identifying and testing various vulnerabilities
              </p>

              {/* Checklist Cards */}
             {/* Checklist Cards */}
<div className="grid gap-4">
  {/* IDOR Checklist */}
  <div 
    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-700 hover:bg-slate-800/70 transition-colors cursor-pointer group"
    onClick={() => fetchChecklistData('idor')}
  >
    <div className="flex items-center gap-4">
      <div className="rounded-full bg-indigo-500/10 p-3 group-hover:bg-indigo-500/20 transition-colors">
        <Shield className="h-5 w-5 text-indigo-500" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-200">IDOR (Insecure Direct Object Reference)</h3>
        <p className="text-xs text-slate-400 mt-1">Comprehensive guide for testing IDOR vulnerabilities</p>
      </div>
    </div>
    <Button 
      variant="outline" 
      size="sm"
      className="bg-slate-900/50 border-slate-700 hover:bg-slate-800 text-slate-300 pointer-events-none"
    >
      View Guide
    </Button>
  </div>

  {/* File Upload Checklist */}
  <div 
    className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-slate-700 hover:bg-slate-800/70 transition-colors cursor-pointer group"
    onClick={() => fetchChecklistData('fileupload')}
  >
    <div className="flex items-center gap-4">
      <div className="rounded-full bg-blue-500/10 p-3 group-hover:bg-blue-500/20 transition-colors">
        <Shield className="h-5 w-5 text-blue-500" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-200">File Upload Vulnerabilities</h3>
        <p className="text-xs text-slate-400 mt-1">Checklist for testing unrestricted or insecure file upload issues</p>
      </div>
    </div>
    <Button 
      variant="outline" 
      size="sm"
      className="bg-slate-900/50 border-slate-700 hover:bg-slate-800 text-slate-300 pointer-events-none"
    >
      View Guide
    </Button>
  </div>
</div>
            </div>
          </div>

          {/* Selected Checklist Content */}
          <Sheet open={!!selectedChecklist} onOpenChange={() => setSelectedChecklist(null)}>
            <SheetContent className="w-full sm:max-w-[800px] overflow-y-auto bg-slate-900 p-0">
              <SheetHeader className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-indigo-500/10 p-3">
                      <Shield className="h-6 w-6 text-indigo-500" />
                    </div>
                    <div>
                      {selectedChecklist === 'idor' ? (
                        <>
                          <SheetTitle className="text-xl font-semibold">IDOR Vulnerability Checklist</SheetTitle>
                          <p className="text-sm text-slate-400 mt-1">Complete guide for identifying and testing IDOR vulnerabilities</p>
                        </>
                      ) : selectedChecklist === 'fileupload' ? (
                        <>
                          <SheetTitle className="text-xl font-semibold">File Upload Vulnerability Checklist</SheetTitle>
                          <p className="text-sm text-slate-400 mt-1">Complete guide for identifying and testing file upload vulnerabilities</p>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="rounded-full hover:bg-slate-800/50"
                    onClick={() => setSelectedChecklist(null)}
                  >
                    <X className="h-5 w-5 text-slate-400" />
                  </Button>
                </div>
              </SheetHeader>

              <div className="px-6 pb-6">
                {loadingChecklist ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="rounded-full bg-indigo-500/10 p-4">
                      <svg className="h-8 w-8 text-indigo-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                    <p className="text-indigo-400 font-medium">Loading checklist...</p>
                  </div>
                ) : checklistError ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="rounded-full bg-rose-500/10 p-4">
                      <svg className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-rose-500 font-medium">{checklistError}</p>
                    <Button 
                      variant="outline" 
                      className="mt-4 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20"
                      onClick={() => selectedChecklist && fetchChecklistData(selectedChecklist)}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Table of Contents */}
                    {checklistContent && (
                      <div className="mb-8 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 mb-4">
                          <List className="h-4 w-4 text-indigo-400" />
                          <h3 className="text-sm font-medium text-slate-200">Table of Contents</h3>
                        </div>
                        <div className="space-y-2">
                          {generateTableOfContents(checklistContent).map((heading, index) => (
                            <div 
                              key={index}
                              className="flex items-center gap-2 text-sm text-slate-300 hover:text-indigo-400 transition-colors cursor-pointer"
                              onClick={() => {
                                const element = document.getElementById(heading.id);
                                if (element) {
                                  const sheetContent = document.querySelector('.sheet-content');
                                  const headerOffset = 100; // Adjust this value based on your header height
                                  const elementPosition = element.getBoundingClientRect().top;
                                  const offsetPosition = elementPosition - headerOffset;

                                  sheetContent?.scrollBy({
                                    top: offsetPosition,
                                    behavior: 'smooth'
                                  });
                                }
                              }}
                            >
                              <ChevronRight className="h-3 w-3" />
                              <span>{heading.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="prose prose-invert prose-slate max-w-none
                      prose-h1:text-3xl prose-h1:font-bold prose-h1:mb-6 prose-h1:pb-4 prose-h1:border-b prose-h1:border-slate-800 prose-h1:bg-clip-text prose-h1:text-transparent prose-h1:bg-gradient-to-r prose-h1:from-indigo-500 prose-h1:to-purple-500
                      prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-8 prose-h2:mb-4 prose-h2:bg-slate-800/50 prose-h2:p-4 prose-h2:rounded-lg prose-h2:border prose-h2:border-slate-700/50
                      prose-h3:text-xl prose-h3:font-medium prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-slate-200
                      prose-p:text-slate-300 prose-p:leading-7 prose-p:mb-4
                      prose-ul:list-disc prose-ul:pl-6 prose-ul:my-4 prose-ul:space-y-2
                      prose-ol:list-decimal prose-ol:pl-6 prose-ol:my-4 prose-ol:space-y-2
                      prose-li:text-slate-300 prose-li:marker:text-slate-500
                      prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono prose-code:text-slate-200
                      prose-pre:bg-slate-800/50 prose-pre:p-4 prose-pre:rounded-lg prose-pre:border prose-pre:border-slate-700
                      prose-strong:text-slate-200 prose-strong:font-semibold
                      prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:text-indigo-300
                      prose-blockquote:border-l-4 prose-blockquote:border-slate-700 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-400
                      [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                    >
                      {checklistContent && checklistContent.split('```').map((part, i) => {
                        if (i % 2 === 0) {
                          // Process regular markdown content
                          const processed = processMarkdown(part);
                          // Add IDs to headings for scroll functionality
                          const parsedWithIds = processed.replace(/^(##\s+)(.*?)$/gm, (match, prefix, title) => {
                            const id = title.toLowerCase().replace(/[^\w]+/g, '-');
                            return `${prefix}<span id="${id}">${title}</span>`;
                          });
                          const parsed = marked.parse(parsedWithIds);
                          if (typeof parsed === 'string') {
                            return (
                              <div 
                                key={i} 
                                className="mb-6"
                                dangerouslySetInnerHTML={{ 
                                  __html: parsed
                                    .replace(/<div class="table-of-contents">[^]*?<\/div>/, '')
                                    .replace(/<section><\/section>/, '')
                                }}
                              />
                            );
                          }
                          return null;
                        } else {
                          // Process code blocks
                          const [language, ...codeParts] = part.split('\n');
                          const code = codeParts.slice(0, -1).join('\n');
                          return (
                            <div key={i} className="my-6 rounded-lg overflow-hidden bg-slate-800/50 border border-slate-700">
                              <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                                <span className="text-xs font-mono text-slate-400">{language}</span>
                              </div>
                              <pre className="!mt-0 !mb-0">
                                <code className="text-sm text-slate-300">{code}</code>
                              </pre>
                            </div>
                          );
                        }
                      })}
                    </div>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Vulnerabilities Table */}
            <Card className="overflow-hidden">
              <CardHeader className="bg-slate-800/50 px-6 py-5 pb-4 border-b border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
                  <div>
                    <CardTitle className="text-lg font-semibold">Vulnerability List</CardTitle>
                    <CardDescription className="mt-1">
                      Total records: {totalVulnerabilities} • Page {currentPage} of {totalPages}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2 items-center bg-slate-900/60 rounded-full px-3 py-2 shadow-sm">
                    <div className="relative">
                      <span className="absolute left-3 top-1.5 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </span>
                      <input
                        type="text"
                        placeholder="Search vulnerabilities..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition w-44 md:w-56"
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="rounded-full bg-slate-800 border border-slate-700 py-1.5 pl-4 pr-8 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none hover:bg-slate-700 cursor-pointer"
                      >
                        <option value="all">All Types</option>
                        <option value="Smart Contract">Smart Contract</option>
                        <option value="Web">Web</option>
                      </select>
                      <span className="pointer-events-none absolute right-3 top-2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-10 h-10 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                  </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="rounded-full bg-rose-500/10 p-4">
                      <svg className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-rose-500 font-medium">{error}</p>
                    <Button 
                      variant="outline" 
                      className="mt-4 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 border-rose-500/20"
                      onClick={() => window.location.reload()}
                    >
                      Try Again
                    </Button>
                  </div>
                ) : (
                <DataTable
                  data={paginatedVulnerabilities}
                  columns={columns}
                    onRowClick={(row) => {
                      console.log('Row clicked:', row);
                      setSelectedVulnerability(row);
                    }}
                />
                )}
                {totalPages > 1 && (
                  <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-slate-400">
                      Showing <span className="font-medium">{totalVulnerabilities > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
                      <span className="font-medium">{Math.min(currentPage * pageSize, totalVulnerabilities)}</span>{' '}
                      of <span className="font-medium">{totalVulnerabilities}</span> vulnerabilities
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className="hidden sm:flex"
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="ml-1">Previous</span>
                      </Button>
                      <div className="hidden sm:flex gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          return (
                            <Button
                              key={pageNum}
                              variant={currentPage === pageNum ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(pageNum)}
                              className="w-10 h-9 p-0"
                            >
                              {pageNum}
                            </Button>
                          );
                        })}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                      >
                        <span className="mr-1">Next</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className="hidden sm:flex"
                      >
                        Last
                      </Button>
                      <div className="hidden sm:flex items-center ml-3 gap-2 border-l border-slate-700 pl-3">
                        <span className="text-xs text-slate-400">Page</span>
                        <select
                          className="bg-slate-800 border border-slate-700 text-sm rounded-lg p-1 text-slate-300 focus:ring-indigo-500 focus:border-indigo-500 w-14"
                          value={currentPage}
                          onChange={(e) => setCurrentPage(Number(e.target.value))}
                        >
                          {Array.from({ length: totalPages }, (_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-slate-400">of {totalPages}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

        <Dialog open={!!selectedVulnerability} onOpenChange={(open) => !open && setSelectedVulnerability(null)}>
          <DialogContent className="w-full max-w-3xl max-h-[80vh] overflow-y-auto border border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <div className="rounded-full bg-indigo-500/10 p-2">
                  <Shield className="h-6 w-6 text-indigo-500" />
                </div>
                {selectedVulnerability?.name}
              </DialogTitle>
            </DialogHeader>
            
            <div className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="bg-slate-800/50 border border-slate-700/50 hover:border-slate-700 transition">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-purple-500/10 p-2 text-purple-500">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Type</p>
                        <p className="font-medium text-slate-200">{selectedVulnerability?.type}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border border-slate-700/50 hover:border-slate-700 transition">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-500">
                        <List className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Category</p>
                        <p className="font-medium text-slate-200">{selectedVulnerability?.list}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-2">Short Description</h3>
                  <p className="text-sm text-slate-300">{selectedVulnerability?.short_description}</p>
              </div>
                
                <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
                <h3 className="text-sm font-medium text-slate-300 mb-2">Detailed Description</h3>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{selectedVulnerability?.detailed_description}</p>
              </div>
                
              {selectedVulnerability?.example && (
                  <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Example</h3>
                    <CodeBlock code={selectedVulnerability.example} />
                </div>
              )}
              </div>
            </div>

            <DialogFooter className="mt-6 pt-4 border-t border-slate-800">
              <Button 
                variant="outline" 
                onClick={() => setSelectedVulnerability(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 