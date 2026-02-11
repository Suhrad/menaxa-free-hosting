'use client';

import { useState, useEffect, useRef } from 'react';
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
import { apiUrl } from '../lib/api';

// Define the structure of software version data
interface SoftwareVersion {
  cycle: string;
  lts?: boolean;
  releaseDate: string;
  eol: string | boolean;
  latest: string;
  latestReleaseDate: string;
  link?: string;
  codename?: string;
  support?: string | boolean;
  daysRemaining?: number;
  status?: string;
}

// Software entries grouped by name
interface SoftwareData {
  [key: string]: SoftwareVersion[];
}

// API response structure
interface ApiResponse {
  last_updated: string;
  total_records: number;
  data: SoftwareData;
}

// Flattened software version for the table
interface FlattenedSoftwareVersion extends SoftwareVersion {
  name: string;
  displayName: string;
}


export default function EOL() {
  const [loading, setLoading] = useState(true);
  const [softwareData, setSoftwareData] = useState<SoftwareData>({});
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [flattenedData, setFlattenedData] = useState<FlattenedSoftwareVersion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [softwareFilter, setSoftwareFilter] = useState('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'daysRemaining',
    direction: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiUrl('/eol'));
        const data: ApiResponse = await response.json();
        setSoftwareData(data.data);
        setLastUpdated(data.last_updated);
        processData(data.data);
      } catch (error) {
        console.error('Error fetching EOL data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Process the data to create a flattened array and calculate days remaining
  const processData = (data: SoftwareData) => {
    const today = new Date();
    const flattened: FlattenedSoftwareVersion[] = [];
    
    Object.entries(data).forEach(([name, versions]) => {
      versions.forEach(version => {
        const eolDate = typeof version.eol === 'string' ? new Date(version.eol) : null;
        const daysRemaining = eolDate ? differenceInDays(eolDate, today) : undefined;
        
        let status = 'Unknown';
        if (eolDate === null || version.eol === false) {
          status = 'Active';
        } else if (daysRemaining && daysRemaining < 0) {
          status = 'Expired';
        } else if (daysRemaining && daysRemaining < 30) {
          status = 'Critical';
        } else if (daysRemaining && daysRemaining < 90) {
          status = 'Warning';
        } else if (daysRemaining && daysRemaining < 180) {
          status = 'Notice';
        } else {
          status = 'Active';
        }
        
        flattened.push({
          ...version,
          name,
          displayName: `${name} ${version.cycle}${version.lts ? ' LTS' : ''}`,
          daysRemaining: daysRemaining !== undefined ? daysRemaining : Infinity,
          status
        });
      });
    });
    
    setFlattenedData(flattened);
  };

  // Handle search filtering
  const filteredData = flattenedData.filter(software => {
    // Apply search query
    const matchesSearch = searchQuery === '' || 
      software.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      software.cycle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      software.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Apply status filter
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'expired') {
        matchesStatus = software.status === 'Expired';
      } else if (statusFilter === 'critical') {
        matchesStatus = software.status === 'Critical';
      } else if (statusFilter === 'warning') {
        matchesStatus = software.status === 'Warning';
      } else if (statusFilter === 'notice') {
        matchesStatus = software.status === 'Notice';
      } else if (statusFilter === 'active') {
        matchesStatus = software.status === 'Active';
      }
    }
    
    // Apply software filter
    let matchesSoftware = true;
    if (softwareFilter !== 'all') {
      matchesSoftware = software.name === softwareFilter;
    }
    
    return matchesSearch && matchesStatus && matchesSoftware;
  });

  // Get expired software 
  const expiredSoftware = flattenedData.filter(software => 
    software.status === 'Expired'
  ).sort((a, b) => {
    // Sort by most recently expired first
    return (b.daysRemaining || 0) - (a.daysRemaining || 0);
  });

  // Get software expiring in the next 30 days
  const expiringSoon = flattenedData.filter(software => 
    software.status === 'Critical'
  ).sort((a, b) => {
    // Sort by expiring soonest first
    return (a.daysRemaining || 0) - (b.daysRemaining || 0);
  });

  // Sort the filtered data
  const sortedData = [...filteredData].sort((a, b) => {
    const key = sortConfig.key as keyof FlattenedSoftwareVersion;
    let aValue = a[key];
    let bValue = b[key];
    
    // Handle special sorting cases
    if (key === 'latestReleaseDate' || key === 'releaseDate' || key === 'eol') {
      if (typeof aValue === 'string') aValue = new Date(aValue).getTime();
      if (typeof bValue === 'string') bValue = new Date(bValue).getTime();
    }
    
    if (aValue === undefined || aValue === null) return sortConfig.direction === 'asc' ? -1 : 1;
    if (bValue === undefined || bValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
    
    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
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
  }, [searchQuery, statusFilter, softwareFilter]);

  // Get stats for the dashboard cards
  const totalActiveSoftware = flattenedData.filter(s => s.status !== 'Expired').length;
  const totalExpiringSoon = expiringSoon.length;
  const totalExpired = expiredSoftware.length;

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
      case 'Expired':
        variant = 'danger';
        break;
      case 'Critical':
        variant = 'danger'; // Using danger for critical too
        break;
      case 'Warning':
        variant = 'warning';
        break;
      case 'Notice':
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

  // Get unique software names for filter
  const uniqueSoftwareNames = Array.from(new Set(flattenedData.map(item => item.name))).sort();

  // Function to scroll to table and apply a filter
  const scrollToTableWithFilter = (filterValue: string) => {
    setStatusFilter(filterValue);
    
    // Scroll to table
    if (tableRef.current) {
      setTimeout(() => {
        tableRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100); // Small delay to ensure filter is applied first
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
            Software End of Life Tracker
          </h1>
          <p className="text-slate-400">
            Monitor software versions approaching end of life and plan upgrades accordingly
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[400px]">
            <div className="relative">
              <div className="w-20 h-20 rounded-full border-4 border-slate-700/50 border-t-pink-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 mt-6 mb-2">Loading End of Life data...</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="animate-pulse">•</span>
              <span>Fetching software versions</span>
              <span className="animate-pulse">•</span>
              <span>Analyzing EOL dates</span>
              <span className="animate-pulse">•</span>
              <span>Updating dashboard</span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-green-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-emerald-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Active Software</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">Currently supported versions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-emerald-400">{totalActiveSoftware}</div>
                    <p className="text-xs text-slate-400">Supported versions</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-amber-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-amber-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Expiring in 30 Days</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">Requires immediate attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-amber-400">{totalExpiringSoon}</div>
                    <p className="text-xs text-slate-400">Critical updates needed</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-rose-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-rose-500 to-pink-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-rose-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Expired Software</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">End of life versions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-rose-400">{totalExpired}</div>
                    <p className="text-xs text-slate-400">Requires upgrade</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Expiring Soon Section */}
            {expiringSoon.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center">
                      <span className="mr-2">⚠️</span> Expiring in the Next 30 Days
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Software versions requiring immediate attention
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {expiringSoon.slice(0, 6).map((software, index) => (
                      <Card key={index} className="bg-slate-800/50 border border-amber-800/30 hover:border-amber-700/50 transition">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <h3 className="font-medium">{software.displayName}</h3>
                              {software.lts && <Badge variant="purple" className="text-xs">LTS</Badge>}
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-400">
                              <span>EOL Date:</span>
                              <span className="text-amber-400">{formatDate(software.eol as string)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-400">
                              <span>Current Version:</span>
                              <span>{software.latest}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-400">
                              <span>Days Remaining:</span>
                              <Badge variant="danger" className="text-xs">{software.daysRemaining} days</Badge>
                            </div>
                            {software.link && (
                              <a 
                                href={software.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline mt-2 flex items-center"
                              >
                                View Details
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {expiringSoon.length > 6 && (
                    <div className="px-4 pb-4 text-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => scrollToTableWithFilter('critical')}
                      >
                        View All Expiring Soon
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Expired Software Section */}
            {expiredSoftware.length > 0 && (
              <Card className="overflow-hidden">
                <CardHeader>
                  <CardTitle>
                    <div className="flex items-center">
                      <span className="mr-2">🚫</span> Expired Software
                    </div>
                  </CardTitle>
                  <CardDescription>
                    Software versions that have reached end of life
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {expiredSoftware.slice(0, 6).map((software, index) => (
                      <Card key={index} className="bg-slate-800/50 border border-rose-800/30 hover:border-rose-700/50 transition">
                        <CardContent className="p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                              <h3 className="font-medium">{software.displayName}</h3>
                              {software.lts && <Badge variant="purple" className="text-xs">LTS</Badge>}
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-400">
                              <span>EOL Date:</span>
                              <span className="text-rose-400">{formatDate(software.eol as string)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-400">
                              <span>Current Version:</span>
                              <span>{software.latest}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-slate-400">
                              <span>Days Expired:</span>
                              <Badge variant="danger" className="text-xs">{Math.abs(software.daysRemaining || 0)} days</Badge>
                            </div>
                            {software.link && (
                              <a 
                                href={software.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline mt-2 flex items-center"
                              >
                                View Details
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {expiredSoftware.length > 6 && (
                    <div className="px-4 pb-4 text-center">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => scrollToTableWithFilter('expired')}
                      >
                        View All Expired Software
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <Card className="overflow-hidden">
              <CardHeader className="bg-slate-800/50 px-6 py-5 pb-4 border-b border-slate-700">
                <div ref={tableRef} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
                  <div>
                    <CardTitle className="text-lg font-semibold">All Software Versions</CardTitle>
                    <CardDescription className="mt-1">Comprehensive list of software with EOL information</CardDescription>
                  </div>
                  {/* Modern filter/search bar */}
                  <div className="flex flex-wrap gap-2 items-center bg-slate-900/60 rounded-full px-3 py-2 shadow-sm">
                    <div className="relative">
                      <span className="absolute left-3 top-1.5 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </span>
                      <input
                        type="search"
                        placeholder="Search software..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition w-44 md:w-56"
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-full bg-slate-800 border border-slate-700 py-1.5 pl-4 pr-8 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none hover:bg-slate-700 cursor-pointer"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="notice">Notice (6 months)</option>
                        <option value="warning">Warning (3 months)</option>
                        <option value="critical">Critical (30 days)</option>
                        <option value="expired">Expired</option>
                      </select>
                      <span className="pointer-events-none absolute right-3 top-2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={softwareFilter}
                        onChange={(e) => setSoftwareFilter(e.target.value)}
                        className="rounded-full bg-slate-800 border border-slate-700 py-1.5 pl-4 pr-8 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none hover:bg-slate-700 cursor-pointer"
                      >
                        <option value="all">All Software</option>
                        {uniqueSoftwareNames.map((name) => (
                          <option key={name} value={name}>{name}</option>
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
                  columns={[
                    {
                      key: 'displayName',
                      label: 'Software',
                      sortable: true,
                      width: '25%',
                      render: (row: FlattenedSoftwareVersion) => (
                        <span className="text-sm text-slate-300 font-semibold flex items-center gap-2">
                          {row.displayName}
                          {row.lts && <Badge variant="purple" className="text-xs">LTS</Badge>}
                        </span>
                      ),
                      onSort: () => handleSortChange('displayName'),
                      sortDirection: sortConfig.key === 'displayName' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'latest',
                      label: 'Latest Version',
                      sortable: true,
                      width: '15%',
                      render: (row: FlattenedSoftwareVersion) => (
                        <span className="text-sm text-slate-300">{row.latest}
                          <span className="block text-xs text-slate-400">Released: {formatDate(row.latestReleaseDate)}</span>
                        </span>
                      ),
                      onSort: () => handleSortChange('latestReleaseDate'),
                      sortDirection: sortConfig.key === 'latestReleaseDate' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'releaseDate',
                      label: 'Release Date',
                      sortable: true,
                      width: '15%',
                      render: (row: FlattenedSoftwareVersion) => (
                        <span className="text-sm text-slate-400 font-mono">{formatDate(row.releaseDate)}</span>
                      ),
                      onSort: () => handleSortChange('releaseDate'),
                      sortDirection: sortConfig.key === 'releaseDate' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'eol',
                      label: 'EOL Date',
                      sortable: true,
                      width: '15%',
                      render: (row: FlattenedSoftwareVersion) => (
                        <span className="text-sm text-slate-400 font-mono">{typeof row.eol === 'string' ? formatDate(row.eol) : 'N/A'}</span>
                      ),
                      onSort: () => handleSortChange('eol'),
                      sortDirection: sortConfig.key === 'eol' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'daysRemaining',
                      label: 'Days Remaining',
                      sortable: true,
                      width: '15%',
                      render: (row: FlattenedSoftwareVersion) => {
                        if (!row.daysRemaining || row.daysRemaining === Infinity) return <span className="text-sm text-slate-400 font-mono">N/A</span>;
                        let color = 'text-emerald-400';
                        if (row.daysRemaining < 0) color = 'text-rose-500';
                        else if (row.daysRemaining < 30) color = 'text-amber-400';
                        else if (row.daysRemaining < 90) color = 'text-yellow-400';
                        else if (row.daysRemaining < 180) color = 'text-cyan-400';
                        return (
                          <span className={`text-sm font-mono ${color}`}>{row.daysRemaining < 0 ? `Expired ${Math.abs(row.daysRemaining)} days ago` : `${row.daysRemaining} days`}</span>
                        );
                      },
                      onSort: () => handleSortChange('daysRemaining'),
                      sortDirection: sortConfig.key === 'daysRemaining' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'status',
                      label: 'Status',
                      sortable: true,
                      width: '15%',
                      render: (row: FlattenedSoftwareVersion) => (
                        <Badge variant={
                          row.status === 'Expired' ? 'danger' :
                          row.status === 'Critical' ? 'danger' :
                          row.status === 'Warning' ? 'warning' :
                          row.status === 'Notice' ? 'info' :
                          row.status === 'Active' ? 'success' : 'default'
                        } className="text-xs font-semibold px-2 py-1">{row.status || 'Unknown'}</Badge>
                      ),
                      onSort: () => handleSortChange('status'),
                      sortDirection: sortConfig.key === 'status' ? sortConfig.direction : undefined
                    },
                  ]}
                  data={paginatedData}
                  onRowClick={(row) => row.link && window.open(row.link, '_blank')}
                />
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-slate-400">
                      Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredData.length)} of {filteredData.length} entries
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
                <div className="p-4 text-xs text-slate-400 border-t border-slate-800">
                  Data last updated: {formatDate(lastUpdated)}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 
