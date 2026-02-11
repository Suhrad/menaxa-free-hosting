'use client';

import React, { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import DashboardLayout from '../components/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { apiUrl } from '../lib/api';

// News article interface
interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export default function News() {
  // State management
  const [loading, setLoading] = useState(true);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<NewsArticle[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [sortConfig, setSortConfig] = useState({
    key: 'pubDate',
    direction: 'desc' as 'asc' | 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch news data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(apiUrl('/news'));
        const data = await response.json();
        
        setNewsArticles(data.data);
        setFilteredArticles(data.data);
      } catch (error) {
        console.error('Error fetching news data:', error);
        // Fallback to mock data in case of API failure
        setNewsArticles([]);
        setFilteredArticles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString.split('T')[0]; // Fallback format
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), 'h:mm a');
    } catch (e) {
      return dateString.split('T')[1]?.substring(0, 5) || ''; // Fallback format
    }
  };

  // Handle sorting
  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...newsArticles];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.source.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply source filter
    if (sourceFilter) {
      filtered = filtered.filter(article => 
        article.source.toLowerCase() === sourceFilter.toLowerCase()
      );
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      if (sortConfig.key === 'pubDate') {
        const dateA = new Date(a.pubDate).getTime();
        const dateB = new Date(b.pubDate).getTime();
        
        return sortConfig.direction === 'asc' 
          ? dateA - dateB 
          : dateB - dateA;
      }
      
      const aValue = a[sortConfig.key as keyof NewsArticle];
      const bValue = b[sortConfig.key as keyof NewsArticle];
      
      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      // Safe string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      // Default comparison for other types
      return sortConfig.direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });
    
    setFilteredArticles(filtered);
  }, [newsArticles, searchTerm, sourceFilter, sortConfig]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sourceFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredArticles.length / itemsPerPage);
  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique sources for filter dropdown
  const uniqueSources = Array.from(new Set(newsArticles.map(article => article.source)));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="border-b border-slate-700 pb-4">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
            Threat Intelligence Feed
          </h1>
          <p className="text-slate-400">
            Cybersecurity news, vulnerability reports, and threat advisories
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
            <p className="text-slate-400 mt-6 mb-2">Loading intelligence data...</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="animate-pulse">•</span>
              <span>Fetching news articles</span>
              <span className="animate-pulse">•</span>
              <span>Analyzing sources</span>
              <span className="animate-pulse">•</span>
              <span>Updating dashboard</span>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-blue-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8m-2 12h-9l-2-3h11l2 3zm0-18v3m0 0h-3m3 0h3M10 9H7m0 0v3m0-3V6" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-blue-300">News Articles</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-extrabold text-white">{newsArticles.length}</div>
                  <div className="text-sm text-blue-300 mt-1">Total articles</div>
                  <Badge className="bg-blue-600/30 border border-blue-500/50 text-blue-300 px-3 py-1 text-xs flex items-center gap-1 mt-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                    +8 today
                  </Badge>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-purple-400 to-violet-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-purple-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-purple-300">Latest Update</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-extrabold text-white">
                    {newsArticles.length > 0 ? formatDate(newsArticles[0].pubDate) : "No data"}
                  </div>
                  <div className="text-sm text-purple-300 mt-1 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {newsArticles.length > 0 ? formatTime(newsArticles[0].pubDate) : ""}
                  </div>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-900/60 to-slate-900 border-none shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-transform duration-200">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
                <CardHeader className="pb-2 flex flex-col items-start">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-emerald-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-emerald-300">Sources Monitored</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-extrabold text-white">{uniqueSources.length}</div>
                  <div className="text-sm text-emerald-300 mt-1">Active sources</div>
                  <div className="flex gap-1 flex-wrap mt-3">
                    {uniqueSources.slice(0, 3).map((source, index) => (
                      <Badge key={index} className="bg-emerald-600/30 border border-emerald-500/50 text-emerald-300">
                        {source.split(' ')[0]}
                      </Badge>
                    ))}
                    {uniqueSources.length > 3 && (
                      <Badge className="bg-emerald-600/30 border border-emerald-500/50 text-emerald-300">
                        +{uniqueSources.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Data Table Section */}
            <Card className="overflow-hidden shadow-lg bg-slate-800/30 border border-slate-700 hover:border-slate-600 transition">
              <CardHeader className="bg-slate-800/50 px-6 py-5 pb-4 border-b border-slate-700">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full">
                  <CardTitle className="text-lg font-semibold flex items-center space-x-3">
                    <div className="rounded-full bg-slate-700/70 p-2 text-slate-300 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span>News & Intelligence</span>
                  </CardTitle>
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
                        placeholder="Search intelligence..."
                        value={searchTerm}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition w-44 md:w-56"
                      />
                    </div>
                    <div className="relative">
                      <select
                        value={sourceFilter}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSourceFilter(e.target.value)}
                        className="rounded-full bg-slate-800 border border-slate-700 py-1.5 pl-4 pr-8 text-sm text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition appearance-none hover:bg-slate-700 cursor-pointer"
                      >
                        <option value="">All Sources</option>
                        {uniqueSources.map((source, i) => (
                          <option key={i} value={source}>{source}</option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-3 top-2 text-slate-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setSourceFilter('');
                      }}
                      className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px]">
                    <thead>
                      <tr className="bg-slate-800/50">
                        <th 
                          className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort('source')}
                        >
                          <div className="flex items-center">
                            Source
                            {sortConfig.key === 'source' && (
                              <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort('pubDate')}
                        >
                          <div className="flex items-center">
                            Date
                            {sortConfig.key === 'pubDate' && (
                              <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th 
                          className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider cursor-pointer"
                          onClick={() => requestSort('title')}
                        >
                          <div className="flex items-center">
                            Title
                            {sortConfig.key === 'title' && (
                              <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {paginatedArticles.length > 0 ? (
                        paginatedArticles.map((article, index) => (
                          <tr 
                            key={index} 
                            className="hover:bg-blue-900/20 cursor-pointer transition-colors duration-150 group"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className="bg-blue-900/30 text-blue-300 text-xs font-semibold px-2 py-1">{article.source}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                              {formatDate(article.pubDate)} • {formatTime(article.pubDate)}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              <a 
                                href={article.link} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-indigo-300 font-semibold hover:text-indigo-200 hover:underline transition group-hover:text-indigo-200"
                              >
                                {article.title}
                              </a>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-10 text-center text-slate-400">
                            No results found. Try adjusting your filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-sm text-slate-400">
                    Showing <span className="font-medium">{filteredArticles.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{" "}
                    <span className="font-medium">
                      {Math.min(currentPage * itemsPerPage, filteredArticles.length)}
                    </span>{" "}
                    of <span className="font-medium">{filteredArticles.length}</span> news items
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
