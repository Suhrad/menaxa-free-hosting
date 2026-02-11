'use client';

import React, { useState, useEffect, useRef } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import DataTable from '../components/DataTable';
import { format, parse, isAfter, isBefore, addDays, differenceInDays } from 'date-fns';
import { clsx } from 'clsx';
import { apiUrl } from '../lib/api';

// Define the structure of Web3 framework version data
interface Web3FrameworkVersion {
  name: string;
  author: string;
  created_at: string;
  release_url: string;
  framework: string;
  release_type: string;
  tag_name: string;
  body: string;
  draft: boolean;
  prerelease: boolean;
  daysSinceRelease?: number | null;
}

// Define the column type for DataTable
interface Column {
  id: string;
  header: string;
  accessor: string;
  render?: (row: Web3FrameworkVersion) => React.ReactNode;
}

// API response structure
interface ApiResponse {
  last_updated: string;
  total_records: number;
  data: Web3FrameworkVersion[];
}

export default function ReleasePage() {
  const [loading, setLoading] = useState(true);
  const [frameworkData, setFrameworkData] = useState<Web3FrameworkVersion[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'daysSinceRelease',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const tableRef = useRef<HTMLDivElement>(null);
  const [authorFilter, setAuthorFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const normalizeRelease = (item: any): Web3FrameworkVersion => {
    const createdAt = typeof item?.created_at === 'string' ? item.created_at : new Date().toISOString();
    const parsedCreatedAt = new Date(createdAt);
    const daysSinceRelease = Number.isNaN(parsedCreatedAt.getTime())
      ? null
      : Math.floor((Date.now() - parsedCreatedAt.getTime()) / (1000 * 60 * 60 * 24));

    const framework = typeof item?.framework === 'string' && item.framework.trim()
      ? item.framework
      : typeof item?.author === 'string' && item.author.trim()
        ? item.author
        : 'unknown';

    const releaseUrl = typeof item?.release_url === 'string' && item.release_url.trim()
      ? item.release_url
      : typeof item?.html_url === 'string' && item.html_url.trim()
        ? item.html_url
        : '#';

    const tagName = typeof item?.tag_name === 'string' && item.tag_name.trim()
      ? item.tag_name
      : typeof item?.name === 'string' && item.name.trim()
        ? item.name
        : 'N/A';

    return {
      name: typeof item?.name === 'string' && item.name.trim() ? item.name : tagName,
      author: typeof item?.author === 'string' && item.author.trim() ? item.author : 'unknown',
      created_at: createdAt,
      release_url: releaseUrl,
      framework,
      release_type: typeof item?.release_type === 'string' ? item.release_type : (item?.prerelease ? 'pre-release' : 'release'),
      tag_name: tagName,
      body: typeof item?.body === 'string' ? item.body : '',
      draft: Boolean(item?.draft),
      prerelease: Boolean(item?.prerelease),
      daysSinceRelease,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiUrl('/web3-releases'));
        const data = await response.json();
        
        if (!data || !data.data) {
          console.error('Invalid response format from API');
          setFrameworkData([]);
          return;
        }

        const processedData = data.data.map((item: any) => normalizeRelease(item));

        console.log(`Loaded ${processedData.length} total releases`);
        setFrameworkData(processedData);
        setLastUpdated(data.last_updated || new Date().toISOString());
      } catch (error) {
        console.error('Error fetching release data:', error);
        setFrameworkData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle search filtering
  const filteredData = frameworkData.filter(framework => {
    const matchesSearch =
      searchQuery === '' ||
      (framework.name && framework.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (framework.release_url && framework.release_url.toLowerCase().includes(searchQuery.toLowerCase()));

    const searchYearMatch =
      /^\d{4}$/.test(searchQuery.trim()) &&
      new Date(framework.created_at).getFullYear().toString() === searchQuery.trim();

    const matchesFramework =
      authorFilter === 'all' || framework.framework === authorFilter;

    let matchesDate = true;
    if (startDate) {
      matchesDate = matchesDate && new Date(framework.created_at) >= new Date(startDate);
    }
    if (endDate) {
      matchesDate = matchesDate && new Date(framework.created_at) <= new Date(endDate);
    }

    return (matchesSearch || searchYearMatch) && matchesFramework && matchesDate;
  });

  // Sort the filtered data
  const sortedData = [...filteredData].sort((a, b) => {
    const key = sortConfig.key as keyof Web3FrameworkVersion;
    
    if (key === 'daysSinceRelease') {
      const aValue = a.daysSinceRelease ?? Infinity;
      const bValue = b.daysSinceRelease ?? Infinity;
      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
    }

    const aValue = a[key];
    const bValue = b[key];

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.toLowerCase().localeCompare(bValue.toLowerCase())
        : bValue.toLowerCase().localeCompare(aValue.toLowerCase());
    }

    return 0;
  });

  // Handle sort change
  const handleSortChange = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = sortedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, authorFilter, startDate, endDate]);

  // Get stats for the dashboard cards
  const totalReleases = frameworkData.length;
  const totalPreReleases = frameworkData.filter(f => f.prerelease).length;
  const totalSecurityReleases = frameworkData.filter(f => f.release_type === 'security').length;

  const trackedProjects = Array.from(
    new Set(frameworkData.map(row => row.framework).filter(Boolean))
  ).join(', ');

  // Function to format dates consistently
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Function to render status badge with appropriate color
  const renderStatusBadge = (status: string) => {
    let variant: 'default' | 'danger' | 'info' | 'success' | 'warning' | 'purple' | 'cyan' = 'default';
    
    switch (status) {
      case 'Deprecated':
        variant = 'danger';
        break;
      case 'Beta':
        variant = 'warning';
        break;
      case 'Alpha':
        variant = 'info';
        break;
      case 'Active':
        variant = 'success';
        break;
      default:
        variant = 'default';
    }
    
    return <Badge variant={variant}>{status}</Badge>;
  };

  // Function to render type badge with appropriate color
  const renderTypeBadge = (type: string) => {
    let variant: 'default' | 'danger' | 'info' | 'success' | 'warning' | 'purple' | 'cyan' = 'default';
    
    switch (type) {
      case 'L1':
        variant = 'purple';
        break;
      case 'L2':
        variant = 'cyan';
        break;
      case 'DEX':
        variant = 'success';
        break;
      default:
        variant = 'default';
    }
    
    return <Badge variant={variant}>{type}</Badge>;
  };

  // Add helper function for badge variants
  const getReleaseTypeBadgeVariant = (type: string): 'default' | 'danger' | 'info' | 'success' | 'warning' | 'purple' | 'cyan' => {
    if (!type) return 'default';
    switch (type.toLowerCase()) {
      case 'security':
        return 'danger';
      case 'major':
        return 'purple';
      case 'minor':
        return 'info';
      case 'patch':
        return 'warning';
      case 'pre-release':
        return 'cyan';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      key: 'framework',
      label: 'Framework',
      sortable: true,
      render: (row: Web3FrameworkVersion) => (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-slate-900/50 text-indigo-300 font-semibold">
            {(row.framework || 'unknown').toUpperCase()}
          </Badge>
        </div>
      ),
    },
    {
      key: 'tag_name',
      label: 'Version',
      sortable: true,
      render: (row: Web3FrameworkVersion) => (
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-slate-900/50 text-emerald-300 font-mono">
            {row.tag_name || 'N/A'}
          </Badge>
         
        
        </div>
      ),
    },
 
    {
      key: 'daysSinceRelease',
      label: 'Days Since Release',
      sortable: true,
      render: (row: Web3FrameworkVersion) => (
        <span className="text-sm font-mono text-slate-400">
          {row.daysSinceRelease !== null ? `${row.daysSinceRelease} days ago` : 'N/A'}
        </span>
      ),
    },
    {
      key: 'release_url',
      label: 'Release URL',
      sortable: false,
      render: (row: Web3FrameworkVersion) => (
        <a
          href={row.release_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-mono break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {row.release_url}
        </a>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="border-b border-slate-700 pb-4 mb-6">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
            Web3 Framework Releases
          </h1>
          <p className="text-slate-400">
            Track releases and updates for Web3 frameworks, L1/L2 chains, and DEXs
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-rose-500/20 border-t-transparent animate-spin mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 mb-2">Loading Web3 framework data...</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="animate-pulse">•</span>
              <span>Fetching framework data</span>
              <span className="animate-pulse">•</span>
              <span>Analyzing releases</span>
              <span className="animate-pulse">•</span>
              <span>Updating dashboard</span>
            </div>
          </div>
        ) : (
          <>
            {/* Web3 Framework Statistics */}
            <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-blue-400" />
                  <CardHeader className="pb-2 flex flex-col items-start">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="rounded-full bg-indigo-500/20 p-3 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <CardTitle className="text-lg font-semibold text-white">Total Releases</CardTitle>
                    </div>
                    <CardDescription className="text-slate-300 text-left">All releases (including pre-releases)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-start gap-2">
                      <div className="text-4xl font-extrabold text-indigo-400">{totalReleases}</div>
                      <p className="text-xs text-slate-400">Across all frameworks</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="relative overflow-hidden bg-gradient-to-br from-purple-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-500 to-pink-400" />
                  <CardHeader className="pb-2 flex flex-col items-start">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="rounded-full bg-purple-500/20 p-3 shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                      </div>
                      <CardTitle className="text-lg font-semibold text-white">Frameworks</CardTitle>
                    </div>
                    <CardDescription className="text-slate-300 text-left">Tracked frameworks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(frameworkData.map(row => row.framework).filter(Boolean))).map(framework => (
                        <Badge
                          key={framework}
                          variant="default"
                          className="bg-purple-900/30 text-purple-400 border-purple-400/20"
                        >
                          {framework}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search frameworks..."
                  className="w-full px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-4 items-center">
                {/* Framework Filter */}
                <select
                  className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={authorFilter}
                  onChange={(e) => setAuthorFilter(e.target.value)}
                >
                  <option value="all">All Frameworks</option>
                  {Array.from(new Set(frameworkData.map(row => row.framework).filter(Boolean))).map(framework => (
                    <option key={framework} value={framework}>{framework}</option>
                  ))}
                </select>
                {/* Date Range Filter */}
                <input
                  type="date"
                  className="px-2 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  className="px-2 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
                {/* Reset Filters Button */}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery('');
                    setAuthorFilter('all');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="ml-2 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300"
                >
                  Reset Filters
                </Button>
              </div>
            </div>

            {/* Data Table and Pagination */}
            <div className="w-full overflow-x-auto min-w-0" ref={tableRef}>
              <div className="min-w-full inline-block align-middle">
                <DataTable
                  data={paginatedData}
                  columns={columns}
                />
              </div>
              {totalPages > 1 && (
                <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-slate-400">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredData.length)}
                    </span>{" "}
                    of <span className="font-medium">{filteredData.length}</span> records
                  </div>
                  <div className="flex flex-wrap gap-2">
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
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          if (page === 1 || page === totalPages) return true;
                          if (page >= currentPage - 2 && page <= currentPage + 2) return true;
                          return false;
                        })
                        .map((page, i, arr) => {
                          if (i > 0 && arr[i - 1] !== page - 1) {
                            return (
                              <React.Fragment key={`ellipsis-${page}`}>
                                <span className="px-2 py-2 text-slate-400">...</span>
                                <Button
                                  variant={currentPage === page ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(page)}
                                >
                                  {page}
                                </Button>
                              </React.Fragment>
                            );
                          }
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                            >
                              {page}
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
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 
