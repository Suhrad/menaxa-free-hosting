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
import { ShieldAlert, AlertTriangle, AlertCircle, Database } from 'lucide-react';
import { apiUrl } from '../lib/api';

interface CVE {
  cve_id: string;
  description: string;
  description_pl: string;
  publishedDate: string;
  score: number;
  severity: string;
  severity_en: string;
}

interface CVEApiResponse {
  last_updated: string;
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  available_years: string[];
  data: CVE[];
}

export default function CVEPage() {
  const [loading, setLoading] = useState(true);
  const [cveData, setCveData] = useState<CVE[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'publishedDate',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [severityFilter, setSeverityFilter] = useState('');

  const fetchCVEData = async (page: number = 1, year?: string) => {
    setLoading(true);
    try {
      const url = new URL(apiUrl('/get-cves'));
      url.searchParams.set('page', page.toString());
      url.searchParams.set('page_size', '20');
      if (year) {
        url.searchParams.set('year', year);
      }

      const response = await fetch(url.toString());
      const data: CVEApiResponse = await response.json();

      setCveData(data.data);
      setTotalPages(data.total_pages);
      setTotalRecords(data.total_records);
      setLastUpdated(data.last_updated);
      setCurrentPage(data.current_page);
      
      // Update available years if we get them from the API
      if (data.available_years && data.available_years.length > 0) {
        setAvailableYears(data.available_years);
      }
    } catch (error) {
      console.error('Error fetching CVE data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data on year or page change
  useEffect(() => {
    fetchCVEData(currentPage, selectedYear);
  }, [currentPage, selectedYear]);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchCVEData(page);
  };

  // Handle year change
  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    setCurrentPage(1);
    fetchCVEData(1, year);
  };

  // Apply search filter
  const filteredData = cveData.filter(cve =>
    (cve.cve_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cve.description.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (severityFilter === '' || cve.severity_en.toLowerCase() === severityFilter)
  );

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString.split('T')[0]; // Fallback format
    }
  };

  // Add formatNumber utility if not present
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return num.toLocaleString('en-IN'); // Indian style grouping
    }
    return num.toLocaleString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
            CVE Database
          </h1>
          <p className="text-slate-400">
            Common Vulnerabilities and Exposures tracking and analysis
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
            <p className="text-slate-400 mt-6 mb-2">Loading CVE data...</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="animate-pulse">•</span>
              <span>Fetching vulnerabilities</span>
              <span className="animate-pulse">•</span>
              <span>Analyzing severity</span>
              <span className="animate-pulse">•</span>
              <span>Updating dashboard</span>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-blue-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-indigo-500/20 p-3 shadow-lg">
                      <Database className="w-6 h-6 text-indigo-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Total CVEs</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">All recorded vulnerabilities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-indigo-400">{formatNumber(totalRecords)}</div>
                    <p className="text-xs text-slate-400">Last updated: {formatDate(lastUpdated)}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-red-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 to-pink-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-red-500/20 p-3 shadow-lg">
                      <ShieldAlert className="w-6 h-6 text-red-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Critical Vulnerabilities</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">Highest severity threats in 2025</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-red-400">351</div>
                    <p className="text-xs text-slate-400">Requires immediate attention</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-orange-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-400 to-yellow-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-orange-400/20 p-3 shadow-lg">
                      <AlertTriangle className="w-6 h-6 text-orange-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">High Severity</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">Significant security risks in 2025</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-orange-400">1,123</div>
                    <p className="text-xs text-slate-400">Should be addressed promptly</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-yellow-300 to-amber-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-yellow-300/20 p-3 shadow-lg">
                      <AlertCircle className="w-6 h-6 text-yellow-400" />
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Medium Severity</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">Moderate security concerns in 2025</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-yellow-400">1,562</div>
                    <p className="text-xs text-slate-400">Plan for remediation</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden shadow-lg">
              <CardHeader className="bg-slate-800/50 px-6 py-5 pb-4 border-b border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
                  <div>
                    <CardTitle className="text-lg font-semibold">CVE Records</CardTitle>
                    <CardDescription className="mt-1">
                      Total records: {totalRecords} • Page {currentPage} of {totalPages}
                    </CardDescription>
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
                        type="text"
                        placeholder="Search CVEs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition w-44 md:w-56"
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={selectedYear}
                        onChange={(e) => handleYearChange(e.target.value)}
                        className="rounded-full bg-slate-800 border border-slate-700 py-1.5 pl-4 pr-8 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none hover:bg-slate-700 cursor-pointer"
                      >
                        <option value="">All Years</option>
                        {availableYears && availableYears.length > 0 && availableYears.map((year) => (
                          <option key={year} value={year}>{year}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                    <div className="relative">
                      <select
                        value={severityFilter}
                        onChange={(e) => setSeverityFilter(e.target.value)}
                        className="rounded-full bg-slate-800 border border-slate-700 py-1.5 pl-4 pr-8 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none hover:bg-slate-700 cursor-pointer"
                      >
                        <option value="">All Severities</option>
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
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
                <div className="overflow-x-auto rounded-b-xl bg-slate-900/40">
                  <table className="w-full min-w-[700px] table-auto break-words">
                    <thead className="sticky top-0 z-10 bg-slate-800/80 backdrop-blur border-b border-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">CVE ID</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Published</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Severity</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Score</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredData.length > 0 ? (
                        filteredData.map((cve) => (
                          <tr
                            key={cve.cve_id}
                            className="hover:bg-blue-900/20 cursor-pointer transition-colors duration-150 group"
                            onClick={() => window.open(`https://nvd.nist.gov/vuln/detail/${cve.cve_id}`, '_blank')}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-indigo-900/30 text-indigo-300 text-xs font-semibold">
                                <ShieldAlert className="w-3 h-3" />
                                {cve.cve_id}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                              {formatDate(cve.publishedDate)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={getSeverityColor(cve.severity_en)}>{cve.severity_en}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                              {cve.score}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-300 whitespace-pre-line break-words max-w-[500px]">
                              {cve.description}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                            No results found. Try adjusting your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-slate-400">
                    Showing <span className="font-medium">{filteredData.length > 0 ? (currentPage - 1) * 20 + 1 : 0}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * 20, totalRecords)}</span>{' '}
                    of <span className="font-medium">{totalRecords}</span> records
                  </div>
                  {totalPages > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                        className="hidden sm:flex"
                      >
                        First
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
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
                              onClick={() => handlePageChange(pageNum)}
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
                        onClick={() => handlePageChange(currentPage + 1)}
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
                        onClick={() => handlePageChange(totalPages)}
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
                          onChange={(e) => handlePageChange(Number(e.target.value))}
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
    </DashboardLayout>
  );
}

function getSeverityColor(severity: string) {
  switch (severity.toLowerCase()) {
    case 'critical':
    case 'krytyczna':
      return 'bg-red-500/20 text-red-400';
    case 'high':
    case 'wysoka':
      return 'bg-orange-500/20 text-orange-400';
    case 'medium':
    case 'średnia':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'low':
    case 'niska':
      return 'bg-green-500/20 text-green-400';
    default:
      return 'bg-gray-500/20 text-gray-400';
  }
} 
