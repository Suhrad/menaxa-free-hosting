'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DashboardLayout from '../components/DashboardLayout';
import DataTable from '../components/DataTable';
import dynamic from 'next/dynamic';
import { Badge } from '../components/ui/badge';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent 
} from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { AlertCircle, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { apiUrl } from '../lib/api';

// Dynamically import ApexCharts to avoid SSR issues
const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

interface ExploitDetail {
  project_name: string;
  quick_summary: string;
  details: string;
  block_data: string[] | null;
  proof_link: string | null;
  funds_lost: number | null;
  date: string;
  root_cause: string | null;
  scam_type: string;
  website_link: string | null;
  name_categories: string | null;
  chain: string | null;
  token_name: string | null;
  token_address: string | null;
}

interface ApiResponse {
  last_updated: string;
  total_records: number;
  data: ExploitDetail[];
}

interface DomainCheckResult {
  domain: string;
  exists: boolean;
  last_updated: string;
}

interface RandomDomain {
  domain: string;
}

type TimeFilter = '3m' | '6m' | '1y' | 'all';

export default function Web3ThreatsPage() {
  const [exploits, setExploits] = useState<ExploitDetail[]>([]);
  const [selectedExploit, setSelectedExploit] = useState<ExploitDetail | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('3m');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof ExploitDetail; direction: 'asc' | 'desc' }>({ 
    key: 'date', 
    direction: 'desc' 
  });
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [chainFilter, setChainFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const pageSize = 10;

  // Domain Check State
  const [domainToCheck, setDomainToCheck] = useState('');
  const [domainCheckResult, setDomainCheckResult] = useState<DomainCheckResult | null>(null);
  const [isCheckingDomain, setIsCheckingDomain] = useState(false);
  const [randomDomains, setRandomDomains] = useState<string[]>([]);
  const [loadingRandomDomains, setLoadingRandomDomains] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiUrl('/web3-threats'));
        const payload = await response.json();

        if (!response.ok) {
          console.error('Web3 API error:', payload);
          setExploits([]);
          setTotalRecords(0);
          return;
        }

        const data = payload as Partial<ApiResponse>;
        const safeData = Array.isArray(data.data) ? data.data : [];
        setExploits(safeData as ExploitDetail[]);
        setTotalRecords(typeof data.total_records === 'number' ? data.total_records : safeData.length);
      } catch (error) {
        console.error('Error fetching data:', error);
        setExploits([]);
        setTotalRecords(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data based on selected time range
  const getFilteredData = () => {
    if (!exploits.length) return [];
    
    const now = new Date();
    const getStartDate = () => {
      switch (timeFilter) {
        case '3m':
          const threeMonthsAgo = new Date(now);
          threeMonthsAgo.setMonth(now.getMonth() - 3);
          return threeMonthsAgo;
        case '6m':
          const sixMonthsAgo = new Date(now);
          sixMonthsAgo.setMonth(now.getMonth() - 6);
          return sixMonthsAgo;
        case '1y':
          const oneYearAgo = new Date(now);
          oneYearAgo.setFullYear(now.getFullYear() - 1);
          return oneYearAgo;
        case 'all':
        default:
          return new Date(0); // Beginning of time
      }
    };
    
    const startDate = getStartDate();
    
    return exploits.filter(exploit => {
      if (!exploit.date) return false;

      // New condition to skip entries before 2015
      const [year] = exploit.date.split('-').map(Number);
      if (year < 2015) return false;
      
      // Parse date correctly handling ISO format "YYYY-MM-DD"
      let exploitDate: Date;
      try {
        // First check if it's in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(exploit.date)) {
          const [year, month, day] = exploit.date.split('-').map(Number);
          exploitDate = new Date(year, month - 1, day); // month is 0-indexed in JS Date
        } else {
          exploitDate = new Date(exploit.date);
        }
        
        // Check if date is valid
        if (isNaN(exploitDate.getTime())) return false;
      } catch (e) {
        console.error('Invalid date:', exploit.date);
        return false;
      }
      
      return exploitDate >= startDate;
    });
  };
  
  const filteredExploits = getFilteredData();
  
  // Get unique scam types for filter dropdown
  const scamTypes = Array.from(new Set(filteredExploits.map(exploit => exploit.scam_type))).filter(Boolean) as string[];
  
  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(filteredExploits.map(exploit => 
    exploit.name_categories ? exploit.name_categories.split(',').map(c => c.trim()) : []
  ).flat())).filter(Boolean).sort() as string[];
  
  // Get unique project names for filter dropdown - limit to first 30 to avoid excessive dropdown length
  const projectNames = Array.from(new Set(filteredExploits.map(exploit => exploit.project_name)))
    .filter(Boolean)
    .sort() // Sort alphabetically
    .slice(0, 30) as string[];
  
  // Apply search filter
  const searchFilteredExploits = filteredExploits.filter(exploit => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      exploit.project_name?.toLowerCase().includes(query) ||
      exploit.quick_summary?.toLowerCase().includes(query) ||
      exploit.scam_type?.toLowerCase().includes(query)
    );
  });
  
  // Apply type filter
  const typeFilteredExploits = searchFilteredExploits.filter(exploit => {
    if (typeFilter === 'all') return true;
    return exploit.scam_type === typeFilter;
  });
  
  // Apply category filter
  const categoryFilteredExploits = typeFilteredExploits.filter(exploit => {
    if (categoryFilter === 'all') return true;
    return exploit.name_categories?.split(',').some(cat => cat.trim() === categoryFilter);
  });
  
  // Apply project filter directly after category filter (remove chain filter)
  const projectFilteredExploits = categoryFilteredExploits.filter(exploit => {
    if (projectFilter === 'all') return true;
    return exploit.project_name === projectFilter;
  });
  
  // Calculate statistics based on filtered data
  const totalLosses = projectFilteredExploits.reduce((sum, exploit) => sum + (exploit.funds_lost ?? 0), 0);
  const averageLoss = projectFilteredExploits.length > 0 ? totalLosses / projectFilteredExploits.length : 0;
  
  // Apply sorting
  const sortedExploits = [...projectFilteredExploits].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];
    
    if (aValue === null || aValue === undefined) return sortConfig.direction === 'asc' ? -1 : 1;
    if (bValue === null || bValue === undefined) return sortConfig.direction === 'asc' ? 1 : -1;
    
    if (sortConfig.key === 'date') {
      // Handle ISO date strings (YYYY-MM-DD) properly
      let dateA: number, dateB: number;
      
      try {
        if (typeof a.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.date)) {
          const [yearA, monthA, dayA] = a.date.split('-').map(Number);
          dateA = new Date(yearA, monthA - 1, dayA).getTime();
        } else {
          dateA = new Date(a.date || '').getTime();
        }
        
        if (typeof b.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.date)) {
          const [yearB, monthB, dayB] = b.date.split('-').map(Number);
          dateB = new Date(yearB, monthB - 1, dayB).getTime();
        } else {
          dateB = new Date(b.date || '').getTime();
        }
        
        // Fallback to string comparison if dates are invalid
        if (isNaN(dateA) || isNaN(dateB)) {
          return sortConfig.direction === 'asc'
            ? String(a.date || '').localeCompare(String(b.date || ''))
            : String(b.date || '').localeCompare(String(a.date || ''));
        }
        
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
      } catch (e) {
        // If anything goes wrong with date parsing, fall back to string comparison
        return sortConfig.direction === 'asc'
          ? String(a.date || '').localeCompare(String(b.date || ''))
          : String(b.date || '').localeCompare(String(a.date || ''));
      }
    }
    
    if (sortConfig.key === 'funds_lost') {
      const fundsA = a.funds_lost || 0;
      const fundsB = b.funds_lost || 0;
      return sortConfig.direction === 'asc' ? fundsA - fundsB : fundsB - fundsA;
    }
    
    if (sortConfig.key === 'token_name') {
      // For token_name, compare the first token in each list for sorting
      const tokenA = a.token_name?.split(',')[0]?.trim() || '';
      const tokenB = b.token_name?.split(',')[0]?.trim() || '';
      return sortConfig.direction === 'asc' 
        ? tokenA.localeCompare(tokenB) 
        : tokenB.localeCompare(tokenA);
    }
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue) 
        : bValue.localeCompare(aValue);
    }
    
    return 0;
  });
  
  // Handle sort change
  const handleSortChange = (key: keyof ExploitDetail) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };
  
  // Format data for line chart - group by month
  const lossesOverTimeData = filteredExploits.reduce((acc: {date: string, value: number}[], exploit) => {
    if (!exploit.date) return acc;
    
    const date = new Date(exploit.date);
    const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    
    const existingMonth = acc.find(item => item.date === monthYear);
    if (existingMonth) {
      existingMonth.value += exploit.funds_lost ?? 0;
    } else {
      acc.push({ date: monthYear, value: exploit.funds_lost ?? 0 });
    }
    return acc;
  }, []).sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });

  const handleExploitDetails = (exploit: ExploitDetail) => {
    setSelectedExploit(exploit);
  };

  // Pagination logic
  const totalPages = Math.ceil(sortedExploits.length / pageSize);
  const paginatedExploits = sortedExploits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Calculate deltas for metrics compared to previous time period
  const calculateDelta = (currentTimeFilter: TimeFilter) => {
    // Define previous time period
    let prevTimeFilter: TimeFilter;
    switch (currentTimeFilter) {
      case '3m':
        prevTimeFilter = '6m'; // Previous 3 months
        break;
      case '6m':
        prevTimeFilter = '1y'; // Previous 6 months
        break;
      case '1y':
        prevTimeFilter = 'all'; // Previous year
        break;
      default:
        return { incidents: 0, losses: 0 };
    }
    
    // Get start dates for current and previous periods
    const now = new Date();
    let currentStartDate: Date, prevStartDate: Date;
    
    switch (currentTimeFilter) {
      case '3m':
        currentStartDate = new Date(now);
        currentStartDate.setMonth(now.getMonth() - 3);
        prevStartDate = new Date(now);
        prevStartDate.setMonth(now.getMonth() - 6);
        break;
      case '6m':
        currentStartDate = new Date(now);
        currentStartDate.setMonth(now.getMonth() - 6);
        prevStartDate = new Date(now);
        prevStartDate.setFullYear(now.getFullYear() - 1);
        break;
      case '1y':
        currentStartDate = new Date(now);
        currentStartDate.setFullYear(now.getFullYear() - 1);
        prevStartDate = new Date(0); // Beginning of time
        break;
      default:
        return { incidents: 0, losses: 0 };
    }
    
    // Calculate current period metrics
    const currentPeriodExploits = exploits.filter(exploit => {
      if (!exploit.date) return false;
      try {
        let exploitDate: Date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(exploit.date)) {
          const [year, month, day] = exploit.date.split('-').map(Number);
          exploitDate = new Date(year, month - 1, day);
        } else {
          exploitDate = new Date(exploit.date);
        }
        if (isNaN(exploitDate.getTime())) return false;
        return exploitDate >= currentStartDate;
      } catch (e) {
        return false;
      }
    });
    
    // Calculate previous period metrics
    const previousPeriodExploits = exploits.filter(exploit => {
      if (!exploit.date) return false;
      try {
        let exploitDate: Date;
        if (/^\d{4}-\d{2}-\d{2}$/.test(exploit.date)) {
          const [year, month, day] = exploit.date.split('-').map(Number);
          exploitDate = new Date(year, month - 1, day);
        } else {
          exploitDate = new Date(exploit.date);
        }
        if (isNaN(exploitDate.getTime())) return false;
        return exploitDate >= prevStartDate && exploitDate < currentStartDate;
      } catch (e) {
        return false;
      }
    });
    
    const currentIncidents = currentPeriodExploits.length;
    const prevIncidents = previousPeriodExploits.length;
    
    const currentLosses = currentPeriodExploits.reduce((sum, exploit) => sum + (exploit.funds_lost ?? 0), 0);
    const prevLosses = previousPeriodExploits.reduce((sum, exploit) => sum + (exploit.funds_lost ?? 0), 0);
    
    // Calculate percentage change
    const incidentsDelta = prevIncidents === 0 ? 100 : ((currentIncidents - prevIncidents) / prevIncidents) * 100;
    const lossesDelta = prevLosses === 0 ? 100 : ((currentLosses - prevLosses) / prevLosses) * 100;
    
    return {
      incidents: incidentsDelta,
      losses: lossesDelta
    };
  };
  
  const deltas = calculateDelta(timeFilter);

  // Fetch random scam domains
  const fetchRandomDomains = async () => {
    setLoadingRandomDomains(true);
    try {
      const response = await fetch(apiUrl('/get-web3-scam-domains'));
      const data = await response.json();
      
      // Log the data to see its structure
      console.log('Domain API response:', data);
      
      // Handle different possible response formats
      if (Array.isArray(data)) {
        // If it's an array of strings or objects
        const domains = data.map((item: any) => typeof item === 'string' ? item : (item.domain || '')).filter(Boolean).slice(0, 5);
        setRandomDomains(domains);
      } else if (data && typeof data === 'object') {
        // If it's an object with a data property
        if (Array.isArray(data.data)) {
          const domains = data.data.map((item: any) => typeof item === 'string' ? item : (item.domain || '')).filter(Boolean).slice(0, 5);
          setRandomDomains(domains);
        } else if (data.domains && Array.isArray(data.domains)) {
          setRandomDomains(data.domains.slice(0, 5));
        } else {
          // If we can't determine the format, use Object.values as a fallback
          const domains = Object.values(data).filter(value => typeof value === 'string').slice(0, 5);
          setRandomDomains(domains.length > 0 ? domains : ['example-scam.com', 'fake-wallet.io', 'crypto-scam.net', 'metamask-connect.co', 'walletsync.org']);
        }
      } else {
        // Fallback to example domains
        setRandomDomains(['example-scam.com', 'fake-wallet.io', 'crypto-scam.net', 'metamask-connect.co', 'walletsync.org']);
      }
    } catch (error) {
      console.error('Error fetching random domains:', error);
      // Provide fallback example domains on error
      setRandomDomains(['example-scam.com', 'fake-wallet.io', 'crypto-scam.net', 'metamask-connect.co', 'walletsync.org']);
    } finally {
      setLoadingRandomDomains(false);
    }
  };

  // Check if a domain is used in phishing
  const checkDomain = async (domain: string) => {
    setIsCheckingDomain(true);
    setDomainCheckResult(null);
    
    try {
      const response = await fetch(apiUrl(`/search?domain=${encodeURIComponent(domain)}`));
      const data = await response.json();
      setDomainCheckResult(data);
    } catch (error) {
      console.error('Error checking domain:', error);
    } finally {
      setIsCheckingDomain(false);
    }
  };

  // Load random domains on initial page load
  useEffect(() => {
    fetchRandomDomains();
  }, []);

  // Add formatNumber utility if not present
  const formatNumber = (num: number): string => {
    return num.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };

  useEffect(() => {
    setSelectedExploit(null);
  }, [currentPage, searchQuery, timeFilter, typeFilter, categoryFilter, projectFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
            Web3 Threat Intelligence
          </h1>
          <p className="text-slate-400">
            Real-time monitoring and analysis of Web3 security incidents, exploits and vulnerabilities
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
            <p className="text-slate-400 mt-6 mb-2">Loading Web3 threat data...</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="animate-pulse">•</span>
              <span>Fetching exploits</span>
              <span className="animate-pulse">•</span>
              <span>Analyzing losses</span>
              <span className="animate-pulse">•</span>
              <span>Updating dashboard</span>
            </div>
          </div>
        ) : (
          <>
       
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Total Incidents */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-blue-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-indigo-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Total Incidents</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">
                    {timeFilter !== 'all' && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-300 whitespace-nowrap">
                        {timeFilter === '3m' ? 'Last 3M' : timeFilter === '6m' ? 'Last 6M' : 'Last 1Y'}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-indigo-400">{formatNumber(filteredExploits.length)}</div>
                    {timeFilter !== 'all' && (
                      <p className={`text-xs mt-1 ${deltas.incidents > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {deltas.incidents > 0 ? '📈' : '📉'} {Math.abs(deltas.incidents).toFixed(1)}% vs prev period
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* Total Losses */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-amber-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-amber-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Total Losses</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">
                    {timeFilter !== 'all' && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-300 whitespace-nowrap">
                        {timeFilter === '3m' ? 'Last 3M' : timeFilter === '6m' ? 'Last 6M' : 'Last 1Y'}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-amber-500">${formatNumber(totalLosses)}</div>
                    {timeFilter !== 'all' && (
                      <p className={`text-xs mt-1 ${deltas.losses > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {deltas.losses > 0 ? '📈' : '📉'} {Math.abs(deltas.losses).toFixed(1)}% vs prev period
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* Average Loss */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-cyan-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 to-blue-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-cyan-400/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Average Loss</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300 text-left">
                    {timeFilter !== 'all' && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-300 whitespace-nowrap">
                        {timeFilter === '3m' ? 'Last 3M' : timeFilter === '6m' ? 'Last 6M' : 'Last 1Y'}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-start gap-2">
                    <div className="text-4xl font-extrabold text-cyan-400">${formatNumber(averageLoss)}</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="overflow-hidden h-[400px]">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Losses Over Time</CardTitle>
                    <CardDescription>Financial impact trend analysis</CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-amber-400 font-medium rounded-md bg-amber-400/10 px-3 py-1 border border-amber-400/20 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Time filter applies to all data below
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        variant={timeFilter === '3m' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setTimeFilter('3m')}
                      >
                        3M
                      </Button>
                      <Button 
                        variant={timeFilter === '6m' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setTimeFilter('6m')}
                      >
                        6M
                      </Button>
                      <Button 
                        variant={timeFilter === '1y' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setTimeFilter('1y')}
                      >
                        1Y
                      </Button>
                      <Button 
                        variant={timeFilter === 'all' ? 'default' : 'outline'} 
                        size="sm"
                        onClick={() => setTimeFilter('all')}
                      >
                        All
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 h-[320px]">
                {lossesOverTimeData.length > 0 ? (
                  <div className="w-full h-full">
                    {typeof window !== 'undefined' && (
                      <ApexChart
                        options={{
                          chart: {
                            type: 'area',
                            fontFamily: 'inherit',
                            toolbar: {
                              show: false,
                            },
                            animations: {
                              enabled: true
                            },
                            background: 'transparent',
                          },
                          dataLabels: {
                            enabled: false
                          },
                          fill: {
                            type: 'gradient',
                            gradient: {
                              shade: 'dark',
                              type: 'vertical',
                              shadeIntensity: 0.5,
                              opacityFrom: 0.7,
                              opacityTo: 0.1,
                              stops: [0, 90, 100]
                            }
                          },
                          stroke: {
                            width: 3,
                            curve: 'smooth',
                            lineCap: 'round',
                            colors: ['#6366f1'], // Indigo color
                          },
                          theme: {
                            mode: 'dark'
                          },
                          grid: {
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            strokeDashArray: 3,
                            position: 'back',
                          },
                          xaxis: {
                            categories: lossesOverTimeData.map(item => item.date),
                            labels: {
                              style: {
                                colors: '#94a3b8'
                              }
                            },
                            axisBorder: {
                              show: false
                            },
                            axisTicks: {
                              show: false
                            },
                          },
                          yaxis: {
                            labels: {
                              formatter: (value) => {
                                return '$' + value.toLocaleString();
                              },
                              style: {
                                colors: '#94a3b8'
                              }
                            }
                          },
                          tooltip: {
                            theme: 'dark',
                            y: {
                              formatter: (value) => {
                                return '$' + value.toLocaleString();
                              }
                            }
                          },
                          colors: ['#6366f1'],
                        }}
                        series={[
                          {
                            name: 'Amount (USD)',
                            data: lossesOverTimeData.map(item => item.value)
                          }
                        ]}
                        type="area"
                        height="100%"
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    No data available for the selected time period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Domain Check Section */}
            <Card className="overflow-hidden shadow-lg">
              <CardHeader className="bg-gradient-to-r from-slate-900 to-indigo-900/30 border-b border-slate-700 px-5 py-5">
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Phishing Domain Checker
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Search Box - Full Width */}
                <div className="p-6 bg-slate-800/50 border-b border-slate-700/50">
                  <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Input 
                        type="text" 
                        placeholder="Enter domain to check (e.g., example.com)" 
                        value={domainToCheck}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDomainToCheck(e.target.value)}
                        className="pr-10 w-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && domainToCheck && !isCheckingDomain) {
                            checkDomain(domainToCheck);
                          }
                        }}
                      />
                      {isCheckingDomain && (
                        <div className="absolute right-3 top-0 bottom-0 flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <Button 
                      onClick={() => checkDomain(domainToCheck)} 
                      disabled={!domainToCheck || isCheckingDomain}
                      className="min-w-[100px] shrink-0"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Check
                    </Button>
                  </div>
                </div>
                
                {/* Content Area - Split Design */}
                <div className="grid grid-cols-1 lg:grid-cols-5">
                  {/* Check Result - 3 Columns */}
                  <div className="lg:col-span-3 p-6 border-b lg:border-b-0 lg:border-r border-slate-700/50">
                    <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-indigo-400" />
                      Domain Check Result
                    </h3>
                    
                    {domainCheckResult ? (
                      <div className={`p-4 rounded-lg border ${domainCheckResult.exists ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'}`}>
                        <div className="flex items-start gap-3">
                          {domainCheckResult.exists ? (
                            <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium mb-1">
                              {domainCheckResult.exists ? 'Warning: Phishing domain detected!' : 'Domain appears to be safe.'}
                            </p>
                            <p className="text-sm opacity-90">
                              {domainCheckResult.exists ? 
                                `The domain "${domainCheckResult.domain}" has been reported as a phishing site.` : 
                                `The domain "${domainCheckResult.domain}" has not been identified as a known phishing site.`}
                            </p>
                            <p className="text-xs mt-2 opacity-70">
                              Last updated: {new Date(domainCheckResult.last_updated).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32 border border-dashed border-slate-700/50 rounded-lg bg-slate-800/30">
                        <div className="text-center p-4">
                          <AlertTriangle className="h-5 w-5 text-amber-400 mx-auto mb-2" />
                          <p className="text-slate-400">Enter a domain name above to check if it's a known phishing site</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Known Phishing Domains - 2 Columns */}
                  <div className="lg:col-span-2 p-6">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        Known Phishing Domains
                      </h3>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={fetchRandomDomains}
                        className="h-7 px-2"
                      >
                        {loadingRandomDomains ? (
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1"></div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                        Refresh
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {randomDomains.length > 0 ? (
                        randomDomains.map((domain, index) => (
                          <div 
                            key={index} 
                            className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-md border border-slate-700/50 hover:border-rose-500/30 hover:bg-slate-800 cursor-pointer transition-all duration-200"
                            onClick={() => {
                              setDomainToCheck(domain);
                              checkDomain(domain);
                            }}
                          >
                            <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
                            <span className="text-sm font-mono text-rose-200 truncate">{domain}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-sm p-3 bg-slate-800/30 border border-slate-700/50 rounded-md">
                          No phishing domains available. Use the refresh button to try again.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* --- Recent Incidents Table (MATCH CVE STYLE) --- */}
            <Card className="overflow-hidden shadow-lg mt-8">
              <CardHeader className="bg-slate-800/50 px-6 py-5 pb-4 border-b border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
                  <div>
                    <CardTitle className="text-lg font-semibold">Recent Incidents</CardTitle>
                    <CardDescription className="mt-1">
                      Major Web3 security incidents and exploits
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
                        type="search"
                        placeholder="Search exploits..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-9 pr-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition w-44 md:w-56"
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={categoryFilter}
                        onChange={(e) => {
                          setCategoryFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="rounded-full bg-slate-800 border border-slate-700 py-1.5 pl-4 pr-8 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none hover:bg-slate-700 cursor-pointer"
                      >
                        <option value="all">All Categories</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>{category}</option>
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
                        value={typeFilter}
                        onChange={(e) => {
                          setTypeFilter(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="rounded-full bg-slate-800 border border-slate-700 py-1.5 pl-4 pr-8 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition appearance-none hover:bg-slate-700 cursor-pointer"
                      >
                        <option value="all">All Types</option>
                        {scamTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
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

              {/* Time filter display bar */}
              <div className="mt-4 bg-slate-800/50 rounded-lg border border-slate-700/50 p-3 flex flex-wrap items-center justify-between gap-3 mx-6">
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">Time Range: </span>
                  <span className="text-sm font-bold text-amber-400">
                    {timeFilter === '3m' ? 'Last 3 Months' : 
                     timeFilter === '6m' ? 'Last 6 Months' : 
                     timeFilter === '1y' ? 'Last Year' : 
                     'All Time'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Change time range:</span>
                  <div className="flex rounded-md overflow-hidden border border-slate-700">
                    <Button 
                      variant={timeFilter === '3m' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setTimeFilter('3m')}
                      className="rounded-none border-0 border-r border-slate-700 h-8 px-3"
                    >
                      3M
                    </Button>
                    <Button 
                      variant={timeFilter === '6m' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setTimeFilter('6m')}
                      className="rounded-none border-0 border-r border-slate-700 h-8 px-3"
                    >
                      6M
                    </Button>
                    <Button 
                      variant={timeFilter === '1y' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setTimeFilter('1y')}
                      className="rounded-none border-0 border-r border-slate-700 h-8 px-3"
                    >
                      1Y
                    </Button>
                    <Button 
                      variant={timeFilter === 'all' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setTimeFilter('all')}
                      className="rounded-none border-0 h-8 px-3"
                    >
                      All
                    </Button>
                  </div>
                </div>
              </div>

              <CardContent className="p-0">
                <DataTable
                  columns={[
                    {
                      key: 'project_name',
                      label: 'Name',
                      sortable: true,
                      width: '20%',
                      render: (row: ExploitDetail) => (
                        <span className="text-sm text-slate-300 font-semibold">{row.project_name}</span>
                      ),
                      onSort: () => handleSortChange('project_name'),
                      sortDirection: sortConfig.key === 'project_name' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'scam_type',
                      label: 'Type of Issue',
                      sortable: true,
                      width: '20%',
                      render: (row: ExploitDetail) => {
                        const typeToVariant: Record<string, any> = {
                              'Flash Loan Attack': 'danger',
                              'Rug Pull': 'purple',
                              'Smart Contract Exploit': 'warning',
                              'Phishing': 'cyan',
                              'Bridge Exploit': 'danger',
                              'DNS Attack': 'purple',
                              'DeFi Exploit': 'danger',
                              'Governance Attack': 'warning',
                              'Access Control': 'danger',
                              'Oracle Issue': 'warning',
                              'Exit Scam/Honeypot': 'purple',
                              'Exit Scam/Rugpull': 'purple',
                              'Exploit/Other': 'warning',
                              'Exploit/Flash Loan Attack': 'danger',
                              'Exploit/Access control': 'danger',
                              'Access Control Bug': 'danger',
                              'Phishing / Social Engineering': 'cyan',
                              'Private Key Compromise': 'warning',
                              'Insider Dump / Governance Abuse': 'warning',
                              'Exploit/Reentrancy': 'danger',
                              'Exit Scam/Other': 'purple',
                              'Exit Scam/Abandoned': 'purple',
                              'Oracle Manipulation': 'warning',
                              'Ponzi Scheme / MLM': 'warning',
                              'Exploit/Oracle Issue': 'warning',
                              'DeFi Lending Exploit': 'danger',
                              'Exploit/Phishing': 'cyan',
                              'Stablecoin Depeg': 'orange',
                              'Other': 'default'
                        };
                        // Normalize scam_type for matching (case-insensitive, trimmed)
                        const scamTypeKey = (row.scam_type || '').trim().toLowerCase();
                        const variant = typeToVariant[Object.keys(typeToVariant).find(key => key.toLowerCase() === scamTypeKey) ?? ''] || 'default';
                        return (
                          <Badge variant={variant} className="text-xs font-semibold px-2 py-1">{row.scam_type}</Badge>
                        );
                      },
                      onSort: () => handleSortChange('scam_type'),
                      sortDirection: sortConfig.key === 'scam_type' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'name_categories',
                      label: 'Category',
                      sortable: true,
                      width: '20%',
                      render: (row: ExploitDetail) => {
                        const categories = row.name_categories?.split(',') || [];
                        return (
                          <span className="text-sm text-slate-300">
                            {categories.length > 0 ? categories.map(c => c.trim()).join(', ') : <span className="text-slate-500">-</span>}
                          </span>
                        );
                      },
                      onSort: () => handleSortChange('name_categories'),
                      sortDirection: sortConfig.key === 'name_categories' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'funds_lost',
                      label: 'Amount Lost',
                      sortable: true,
                      width: '20%',
                      render: (row: ExploitDetail) => (
                        <span className="text-rose-500 font-medium">${row.funds_lost?.toLocaleString() ?? 'N/A'}</span>
                      ),
                      onSort: () => handleSortChange('funds_lost'),
                      sortDirection: sortConfig.key === 'funds_lost' ? sortConfig.direction : undefined
                    },
                    {
                      key: 'date',
                      label: 'Date',
                      sortable: true,
                      width: '20%',
                      render: (row: ExploitDetail) => {
                        let formattedDate = row.date;
                        try {
                          if (row.date && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
                            const [year, month, day] = row.date.split('-').map(Number);
                            const date = new Date(year, month - 1, day);
                            if (!isNaN(date.getTime())) {
                              formattedDate = date.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              });
                            }
                          }
                        } catch (e) {}
                        return (
                          <span className="text-sm text-slate-400 font-mono">{formattedDate}</span>
                        );
                      },
                      onSort: () => handleSortChange('date'),
                      sortDirection: sortConfig.key === 'date' ? sortConfig.direction : undefined
                    },
                  ]}
                  data={paginatedExploits}
                  onRowClick={handleExploitDetails}
                />
                {/* Pagination */}
                <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-slate-400">
                    Showing <span className="font-medium">{sortedExploits.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * pageSize, sortedExploits.length)}</span> of <span className="font-medium">{sortedExploits.length}</span> results
                    {timeFilter !== 'all' && (
                      <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                        {timeFilter === '3m' ? 'Last 3 months' : timeFilter === '6m' ? 'Last 6 months' : 'Last year'}
                      </span>
                    )}
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

        <Dialog open={!!selectedExploit} onOpenChange={() => setSelectedExploit(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-slate-900 border border-slate-800">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                {selectedExploit?.project_name}
                {selectedExploit?.website_link && (
                  <Link
                    href={selectedExploit.website_link}
                    target="_blank"
                    className="text-indigo-400 hover:text-indigo-300 transition inline-flex"
                    title="Open project website"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </Link>
                )}
              </DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="bg-slate-800/50 border border-slate-700/50 hover:border-slate-700 transition">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-purple-500/10 p-2 text-purple-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Type of Issue</p>
                      <p className="font-medium">{selectedExploit?.scam_type}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/50 border border-slate-700/50 hover:border-slate-700 transition">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Category</p>
                      <p className="font-medium">{selectedExploit?.name_categories || 'Unknown'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="bg-slate-800/50 border border-slate-700/50 hover:border-slate-700 transition">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-amber-500/10 p-2 text-amber-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Date</p>
                      <p className="font-medium">
                        {(() => {
                          if (!selectedExploit?.date) return 'Unknown';
                          try {
                            if (/^\d{4}-\d{2}-\d{2}$/.test(selectedExploit.date)) {
                              const [year, month, day] = selectedExploit.date.split('-').map(Number);
                              const date = new Date(year, month - 1, day);
                              if (!isNaN(date.getTime())) {
                                return date.toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                });
                              }
                            }
                            return selectedExploit.date;
                          } catch (e) {
                            return selectedExploit.date;
                          }
                        })()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-slate-800/50 border border-slate-700/50 hover:border-slate-700 transition">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-rose-500/10 p-2 text-rose-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-slate-400">Amount Lost</p>
                      <p className="font-medium text-rose-500">${selectedExploit?.funds_lost?.toLocaleString() ?? 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {selectedExploit?.website_link && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9.01 9.01 0 00-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 019-9m-9 9c-1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c1.657 0 3-4.03 3-9s-1.343-9-3-9" />
                  </svg>
                  Website
                </h3>
                <Card className="bg-slate-800/50 border border-slate-700/50">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 015.656 0l4 4a4 4 0 01-5.656 5.656l-1.102-1.101" />
                      </svg>
                      <Link
                        href={selectedExploit.website_link}
                        target="_blank"
                        className="text-indigo-400 hover:text-indigo-300 hover:underline break-all transition"
                      >
                        {selectedExploit.website_link}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {selectedExploit?.root_cause && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Root Cause
                </h3>
                <Card className="bg-slate-800/50 border border-slate-700/50">
                  <CardContent className="p-4">
                    <p className="text-slate-300 text-sm">{selectedExploit.root_cause}</p>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={() => setSelectedExploit(null)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
} 
