'use client';

import { useEffect, useState } from 'react';
import DataTable from '../components/DataTable';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import Link from 'next/link';
import { ShieldAlert, AlertTriangle, AlertCircle, Database } from 'lucide-react';

interface Tool {
  name: string;
  short_description: string;
  Link: string;
  Category: string;
}

export default function ToolsPage() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });
  const pageSize = 25;

  useEffect(() => {
    const fetchTools = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/tools');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setTools(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load tools');
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, []);

  const getFilteredTools = () => {
    return tools.filter(tool => {
      const categoryMatch = selectedCategory === 'all' || tool.Category === selectedCategory;
      const searchMatch = searchQuery === '' ||
        tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.short_description.toLowerCase().includes(searchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });
  };

  const filteredTools = getFilteredTools();
  const totalTools = filteredTools.length;
  const totalPages = Math.ceil(totalTools / pageSize);

  // Sort the filtered tools
  const sortedTools = [...filteredTools].sort((a, b) => {
    const key = sortConfig.key as keyof Tool;
    const aValue = a[key];
    const bValue = b[key];
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    return 0;
  });

  const paginatedTools = sortedTools.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const getCategoryCount = (category: string) => {
    return tools.filter(t => t.Category === category).length;
  };

  const handleSortChange = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const categories = Array.from(new Set(tools.map(t => t.Category))).sort();

  const columns = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      width: '30%',
      render: (row: Tool) => (
        <span className="text-sm text-slate-300 font-semibold">{row.name}</span>
      ),
      onSort: () => handleSortChange('name'),
      sortDirection: sortConfig.key === 'name' ? sortConfig.direction : undefined
    },
    {
      key: 'Category',
      label: 'Category',
      sortable: true,
      width: '20%',
      render: (row: Tool) => (
        <Badge variant="info">{row.Category}</Badge>
      ),
      onSort: () => handleSortChange('Category'),
      sortDirection: sortConfig.key === 'Category' ? sortConfig.direction : undefined
    },
    {
      key: 'short_description',
      label: 'Description',
      sortable: false,
      width: '35%',
      render: (row: Tool) => (
        <span className="text-sm text-slate-400">{row.short_description}</span>
      ),
    },
    {
      key: 'Link',
      label: 'Link',
      sortable: false,
      width: '35%',
      render: (row: Tool) => (
        <a href={row.Link} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline break-all">{row.Link}</a>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
            Security & Audit Tools
          </h1>
          <p className="text-slate-400">
            Discover, filter, and explore security tools for smart contracts and web security.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-slate-700/50 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 mt-6 mb-2">Loading tools database...</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="animate-pulse">•</span>
              <span>Fetching tools</span>
              <span className="animate-pulse">•</span>
              <span>Analyzing categories</span>
              <span className="animate-pulse">•</span>
              <span>Updating dashboard</span>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-center">
            <div className="rounded-full bg-rose-500/20 p-4 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-rose-400 font-semibold mb-2">{error}</p>
            <p className="text-slate-400">Please try refreshing the page or check your connection.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-blue-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-indigo-500/20 p-3 shadow-lg">
                      <Database className="w-6 h-6 text-indigo-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Total Tools</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">All tracked security & audit tools</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-indigo-400">{tools.length}</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-pink-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-purple-500/20 p-3 shadow-lg">
                      <AlertTriangle className="w-6 h-6 text-purple-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Want to add your tool?</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">Contact us 👇</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <a href="https://discord.gg/Zd3gsf99" target="_blank" rel="noopener noreferrer" className="text-xl font-bold text-purple-400 underline hover:text-purple-300 transition">
                      discord.gg/Zd3gsf99
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
            <Card className="overflow-hidden shadow-lg">
              <CardHeader className="bg-slate-800/50 px-6 py-5 pb-4 border-b border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
                  <div>
                    <CardTitle className="text-lg font-semibold">Tool Records</CardTitle>
                    <CardDescription className="mt-1">
                      Total records: {filteredTools.length} • Page {currentPage} of {totalPages}
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
                        placeholder="Search tools..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition w-44 md:w-56"
                      />
                    </div>
                    <div className="relative">
                      <select
                        className="rounded-full bg-slate-800 border border-slate-700 py-1.5 pl-4 pr-8 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none hover:bg-slate-700 cursor-pointer"
                        value={selectedCategory}
                        onChange={e => setSelectedCategory(e.target.value)}
                      >
                        <option value="all">All Categories</option>
                        {categories.map((cat, i) => (
                          <option key={i} value={cat}>{cat}</option>
                        ))}
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
                <DataTable
                  columns={columns}
                  data={paginatedTools}
                />
                {/* Pagination Controls */}
                <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-slate-400">
                    Showing <span className="font-medium">{filteredTools.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * pageSize, filteredTools.length)}</span>{' '}
                    of <span className="font-medium">{filteredTools.length}</span> tools
                  </div>
                  {totalPages > 1 && (
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
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 