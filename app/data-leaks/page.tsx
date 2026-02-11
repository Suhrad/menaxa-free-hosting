'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import DashboardLayout from '../components/DashboardLayout';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import DataTable from '../components/DataTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { apiUrl } from '../lib/api';

// Interface for Data Leak
interface DataLeak {
  domain: string;
  breach_date: string;
  data_leaked: string;
  leak_count: number;
  description: string;
  name: string;
  references: string[];
}

// Interface for Data Leak API Response
interface LeakApiResponse {
  last_updated: string;
  total_records: number;
  data: DataLeak[];
}

export default function DataLeaksPage() {
  const [loading, setLoading] = useState(true);
  const [dataLeaks, setDataLeaks] = useState<DataLeak[]>([]);
  const [filteredLeaks, setFilteredLeaks] = useState<DataLeak[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [dataTypeFilter, setDataTypeFilter] = useState('all');
  const [dateRangeFilter, setDateRangeFilter] = useState({ 
    startDate: '', 
    endDate: '' 
  });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'breach_date',
    direction: 'desc'
  });
  const [selectedLeak, setSelectedLeak] = useState<DataLeak | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiUrl('/leaks'));
        const data: LeakApiResponse = await response.json();
        setDataLeaks(data.data);
        setFilteredLeaks(data.data);
        setLastUpdated(data.last_updated);
      } catch (error) {
        console.error('Error fetching data leak information:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Convert camelCase to title case
  function camelCaseToTitleCase(str: string) {
    const result = str
      .replace(/([a-z])([A-Z])/g, '$1 $2')     // space between lower & upper
      .replace(/([a-zA-Z])([0-9])/g, '$1 $2'); // space between letter & number
    return result.charAt(0).toUpperCase() + result.slice(1);
  }

  // Format dates
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString.split('T')[0]; // Fallback format
    }
  };

  // Format number with commas
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Extract unique data types from the data_leaked field
  const getUniqueDataTypes = () => {
    const allDataTypes = new Set<string>();
    
    dataLeaks.forEach(leak => {
      const types = leak.data_leaked.split(',').map(type => type.trim());
      types.forEach(type => allDataTypes.add(type));
    });
    
    return Array.from(allDataTypes).sort();
  };

  // Apply filters
  useEffect(() => {
    let results = [...dataLeaks];
    
    // Apply search filter
    if (searchQuery) {
      results = results.filter(leak => 
        leak.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leak.domain.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leak.data_leaked.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply data type filter
    if (dataTypeFilter !== 'all') {
      results = results.filter(leak => 
        leak.data_leaked.toLowerCase().includes(dataTypeFilter.toLowerCase())
      );
    }
    
    // Apply date range filter
    if (dateRangeFilter.startDate) {
      const startDate = new Date(dateRangeFilter.startDate);
      results = results.filter(leak => {
        const breachDate = new Date(leak.breach_date);
        return breachDate >= startDate;
      });
    }
    
    if (dateRangeFilter.endDate) {
      const endDate = new Date(dateRangeFilter.endDate);
      results = results.filter(leak => {
        const breachDate = new Date(leak.breach_date);
        return breachDate <= endDate;
      });
    }
    
    // Apply sorting
    results.sort((a, b) => {
      const key = sortConfig.key as keyof DataLeak;
      let aValue = a[key];
      let bValue = b[key];
      
      // Special handling for date and number fields
      if (key === 'breach_date') {
        aValue = new Date(a.breach_date).getTime();
        bValue = new Date(b.breach_date).getTime();
      } else if (key === 'leak_count') {
        aValue = a.leak_count;
        bValue = b.leak_count;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    setFilteredLeaks(results);
  }, [dataLeaks, searchQuery, dataTypeFilter, dateRangeFilter.startDate, dateRangeFilter.endDate, sortConfig]);

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setDataTypeFilter('all');
    setDateRangeFilter({ startDate: '', endDate: '' });
  };

  // Handle sort change
  const handleSortChange = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredLeaks.length / itemsPerPage);
  const paginatedData = filteredLeaks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dataTypeFilter, dateRangeFilter.startDate, dateRangeFilter.endDate]);

  // Handle row click to show details
  const handleRowClick = (row: DataLeak) => {
    setSelectedLeak(row);
    setDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="border-b border-slate-700 pb-4 mb-6">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">

            Data Breach Database
          </h1>
          <p className="text-slate-400">
            Comprehensive record of security breaches and exposed data
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
            <p className="text-slate-400 mt-6 mb-2">Loading data breach information...</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="animate-pulse">•</span>
              <span>Fetching breach records</span>
              <span className="animate-pulse">•</span>
              <span>Analyzing data types</span>
              <span className="animate-pulse">•</span>
              <span>Updating dashboard</span>
            </div>
          </div>
        ) : (
          <>
            {/* Data Breach Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-blue-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Total Breaches</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">Tracked incidents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-blue-400">{dataLeaks.length}</div>
                    <p className="text-xs text-slate-400">Security incidents</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-amber-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-amber-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Exposed Records</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">Total records compromised</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-amber-400">{formatNumber(dataLeaks.reduce((total, leak) => total + leak.leak_count, 0))}</div>
                    <p className="text-xs text-slate-400">Compromised data</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-pink-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-indigo-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Major Breaches</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">1M+ records affected</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-indigo-400">{dataLeaks.filter(leak => leak.leak_count >= 1000000).length}</div>
                    <p className="text-xs text-slate-400">Large-scale incidents</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Leaks Table with Filters */}
            <Card className="overflow-hidden border border-slate-700">
              <CardHeader className="px-0 pt-6 pb-2 border-b border-slate-700 bg-transparent">
                <div className="flex flex-col gap-2 w-full">
                  <div>
                    <CardTitle className="text-lg font-semibold px-6">Data Breach Records</CardTitle>
                    <CardDescription className="mt-1 px-6">Search and filter data breaches by various criteria. Click on a row to view detailed information.</CardDescription>
                  </div>
                  {/* Redesigned filter bar */}
                  <div className="w-full px-4 md:px-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 bg-slate-900/80 rounded-xl shadow-sm py-3 px-3 md:px-5">
                      {/* Search */}
                      <div className="relative flex-1 min-w-[180px] max-w-xs">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </span>
                        <input
                          type="search"
                          placeholder="Search by name, domain, or data type"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition w-full h-10 placeholder-slate-400"
                        />
                      </div>
                      {/* Data type filter */}
                      <div className="flex-1 min-w-[140px] max-w-xs">
                        <select
                          value={dataTypeFilter}
                          onChange={(e) => setDataTypeFilter(e.target.value)}
                          className="rounded-lg bg-slate-800 border border-slate-700 py-2 px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition w-full h-10 cursor-pointer"
                        >
                          <option value="all">All Data Types</option>
                          {getUniqueDataTypes().map((type) => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      {/* Start date */}
                      <div className="flex-1 min-w-[120px] max-w-xs flex items-center gap-2">
                        <span className="text-xs text-slate-400 whitespace-nowrap">Start</span>
                        <input
                          type="date"
                          placeholder="Start date"
                          value={dateRangeFilter.startDate}
                          onChange={(e) => setDateRangeFilter(prev => ({ ...prev, startDate: e.target.value }))}
                          className="rounded-lg bg-slate-800 border border-slate-700 py-2 px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition w-full h-10 placeholder-slate-400"
                        />
                      </div>
                      {/* End date */}
                      <div className="flex-1 min-w-[120px] max-w-xs flex items-center gap-2">
                        <span className="text-xs text-slate-400 whitespace-nowrap">End</span>
                        <input
                          type="date"
                          placeholder="End date"
                          value={dateRangeFilter.endDate}
                          onChange={(e) => setDateRangeFilter(prev => ({ ...prev, endDate: e.target.value }))}
                          className="rounded-lg bg-slate-800 border border-slate-700 py-2 px-3 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition w-full h-10 placeholder-slate-400"
                        />
                      </div>
                      {/* Reset button */}
                      <div className="flex items-center md:ml-2 mt-1 md:mt-0">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={resetFilters}
                          className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 h-10 px-4 rounded-lg"
                        >
                          Reset Filters
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <DataTable
                  columns={[
                    {
                      key: 'name',
                      label: 'Breach Name',
                      sortable: true,
                      width: '25%',
                      render: (row: DataLeak) => (
                        <span className="text-sm text-indigo-300 font-semibold flex flex-col">
                          {camelCaseToTitleCase(row.name)}
                          <span className="text-xs text-slate-400 font-normal">{row.domain}</span>
                        </span>
                      ),
                      onSort: () => handleSortChange('name'),
                      sortDirection: sortConfig.key === 'name' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'breach_date',
                      label: 'Breach Date',
                      sortable: true,
                      width: '20%',
                      render: (row: DataLeak) => (
                        <span className="text-sm text-slate-400 font-mono">{formatDate(row.breach_date)}</span>
                      ),
                      onSort: () => handleSortChange('breach_date'),
                      sortDirection: sortConfig.key === 'breach_date' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'data_leaked',
                      label: 'Data Types',
                      sortable: true,
                      width: '35%',
                      render: (row: DataLeak) => {
                        const dataTypes = row.data_leaked.split(',').map(type => type.trim());
                        const displayCount = 3; // Number of badges to show before "+X more"
                        return (
                          <span className="text-sm text-slate-300 flex flex-wrap items-center">
                            {dataTypes.slice(0, displayCount).map((item, index) => (
                              <Badge 
                                key={index} 
                                variant="info" 
                                className="mr-1 mb-1 text-xs font-semibold py-0 px-1.5"
                              >
                                {item}
                              </Badge>
                            ))}
                            {dataTypes.length > displayCount && (
                              <span className="text-xs text-slate-400">+{dataTypes.length - displayCount} more</span>
                            )}
                          </span>
                        );
                      },
                      onSort: () => handleSortChange('data_leaked'),
                      sortDirection: sortConfig.key === 'data_leaked' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'leak_count',
                      label: 'Records',
                      sortable: true,
                      width: '20%',
                      render: (row: DataLeak) => (
                        <span className="text-sm text-rose-400 font-mono">{formatNumber(row.leak_count)}</span>
                      ),
                      onSort: () => handleSortChange('leak_count'),
                      sortDirection: sortConfig.key === 'leak_count' ? sortConfig.direction : undefined
                    }
                  ]}
                  data={paginatedData}
                  onRowClick={handleRowClick}
                />
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-slate-400">
                      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, filteredLeaks.length)}
                      </span>{" "}
                      of <span className="font-medium">{filteredLeaks.length}</span> records
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
                <div className="p-4 flex justify-between items-center text-xs text-slate-400 border-t border-slate-800">
                  <div>
                    Data last updated: {formatDate(lastUpdated)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        {selectedLeak && (
          <DialogContent className="sm:max-w-[625px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl text-indigo-300">{camelCaseToTitleCase(selectedLeak.name)}</DialogTitle>
              <DialogDescription>{selectedLeak.domain}</DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-slate-400 text-sm font-medium col-span-1">Breach Date:</span>
                <span className="col-span-3 text-white">{formatDate(selectedLeak.breach_date)}</span>
              </div>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <span className="text-slate-400 text-sm font-medium col-span-1">Records:</span>
                <span className="col-span-3 text-amber-400 font-semibold">{formatNumber(selectedLeak.leak_count)}</span>
              </div>
              
              <div className="grid grid-cols-4 items-start gap-4">
                <span className="text-slate-400 text-sm font-medium col-span-1">Data Leaked:</span>
                <div className="col-span-3">
                  {selectedLeak.data_leaked.split(',').map((item, index) => (
                    <Badge 
                      key={index} 
                      variant="info" 
                      className="mr-1 mb-1"
                    >
                      {item.trim()}
                    </Badge>
                  ))}
                </div>
              </div>
              
              {selectedLeak.description && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <span className="text-slate-400 text-sm font-medium col-span-1">Description:</span>
                  <div className="col-span-3 text-slate-300">
                    {selectedLeak.description}
                  </div>
                </div>
              )}
              
              {selectedLeak.references && selectedLeak.references.length > 0 && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <span className="text-slate-400 text-sm font-medium col-span-1">References:</span>
                  <div className="col-span-3">
                    {selectedLeak.references.map((ref, index) => (
                      <a 
                        key={index}
                        href={ref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 block mb-1 truncate"
                      >
                        {ref}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button 
                type="button" 
                onClick={() => setDialogOpen(false)}
              >
                Close
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </DashboardLayout>
  );
} 
