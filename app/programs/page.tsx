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
import { Input } from '../components/ui/input';
import DataTable from '../components/DataTable';
import { format } from 'date-fns';
import { Program, ProgramsResponse } from '../types/programs';
import { Skeleton } from '../components/ui/skeleton';
import VulnerabilityTemplates from '../components/VulnerabilityTemplates';

const getPlatformBadgeVariant = (platform: string): 'default' | 'danger' | 'success' | 'warning' | 'info' | 'purple' | 'cyan' => {
  switch (platform) {
    case 'HackerOne':
      return 'purple';
    case 'Bugcrowd':
      return 'cyan';
    case 'YesWeHack':
      return 'success';
    case 'Intigriti':
      return 'info';
    default:
      return 'default';
  }
};

export default function ProgramsPage() {
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [totalPrograms, setTotalPrograms] = useState(0);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'name',
    direction: 'asc'
  });
  const itemsPerPage = 20;
  const tableRef = useRef<HTMLDivElement>(null);
  const [lastUpdated, setLastUpdated] = useState<string>(new Date().toISOString());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/programs');
        const data: ProgramsResponse = await response.json();
        setPrograms(data.data);
        setTotalPrograms(data.total_programs);
        setPlatforms(data.platforms);
        setLastUpdated(new Date().toISOString());
      } catch (error) {
        console.error('Error fetching program data:', error);
        setPrograms([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter and sort
  const filteredPrograms = programs.filter(program => {
    const matchesSearch =
      searchQuery === '' ||
      program.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlatform =
      platformFilter === 'all' || program.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });
  const sortedPrograms = [...filteredPrograms].sort((a, b) => {
    const key = sortConfig.key as keyof Program;
    const aValue = a[key];
    const bValue = b[key];
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortConfig.direction === 'asc'
        ? aValue.toLowerCase().localeCompare(bValue.toLowerCase())
        : bValue.toLowerCase().localeCompare(aValue.toLowerCase());
    }
    return 0;
  });
  const totalPages = Math.ceil(filteredPrograms.length / itemsPerPage);
  const paginatedPrograms = sortedPrograms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  useEffect(() => { setCurrentPage(1); }, [searchQuery, platformFilter]);

  // DataTable columns
  const columns = [
    {
      key: 'name',
      label: 'Program Name',
      sortable: true,
      onSort: () => setSortConfig(prev => ({ key: 'name', direction: prev.key === 'name' && prev.direction === 'asc' ? 'desc' : 'asc' })),
      sortDirection: sortConfig.key === 'name' ? sortConfig.direction : undefined,
      width: '35%',
      render: (row: Program) => (
        <a
          href={row.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-slate-100 hover:text-slate-300"
        >
          {row.name}
        </a>
      )
    },
    {
      key: 'platform',
      label: 'Platform',
      sortable: true,
      onSort: () => setSortConfig(prev => ({ key: 'platform', direction: prev.key === 'platform' && prev.direction === 'asc' ? 'desc' : 'asc' })),
      sortDirection: sortConfig.key === 'platform' ? sortConfig.direction : undefined,
      width: '20%',
      render: (row: Program) => (
        <Badge variant={getPlatformBadgeVariant(row.platform)}>{row.platform}</Badge>
      )
    },
    {
      key: 'max_bounty',
      label: 'Max Bounty',
      sortable: true,
      onSort: () => setSortConfig(prev => ({ key: 'max_bounty', direction: prev.key === 'max_bounty' && prev.direction === 'asc' ? 'desc' : 'asc' })),
      sortDirection: sortConfig.key === 'max_bounty' ? sortConfig.direction : undefined,
      width: '20%',
      render: (row: Program) => (
        <div className="text-sm">
          {row.max_bounty ? (
            <span className="text-green-400">{row.max_bounty.toLocaleString()}</span>
          ) : (
            <span className="text-slate-500">Not specified</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      width: '25%',
      render: (row: Program) => (
        <Button
          variant="default"
          size="sm"
          className="h-8 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100"
          onClick={() => window.open(row.url, '_blank')}
        >
          View Program
          <svg
            className="ml-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </Button>
      )
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="border-b border-slate-700 pb-4 mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
            Bug Bounty
          </h1>
          <p className="text-slate-400">
            Browse and search bug bounty programs from various platforms.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-transparent animate-spin mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 mb-2">Loading bug bounty program data...</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="animate-pulse">•</span>
              <span>Fetching program data</span>
              <span className="animate-pulse">•</span>
              <span>Analyzing programs</span>
              <span className="animate-pulse">•</span>
              <span>Updating dashboard</span>
            </div>
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
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
                      <CardTitle className="text-lg font-semibold text-white">Total Programs</CardTitle>
                    </div>
                    <CardDescription className="text-slate-300 text-left">All active bug bounty programs</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-start gap-2">
                      <div className="text-4xl font-extrabold text-indigo-400">{totalPrograms}</div>
                      <p className="text-xs text-slate-400">Across all platforms</p>
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
                      <CardTitle className="text-lg font-semibold text-white">Platforms</CardTitle>
                    </div>
                    <CardDescription className="text-slate-300 text-left">Tracked platforms</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {platforms.map(platform => (
                        <Badge
                          key={platform}
                          variant={getPlatformBadgeVariant(platform)}
                          className="bg-purple-900/30 text-purple-400 border-purple-400/20"
                        >
                          {platform}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Vulnerability Templates */}
            <div className="mb-6">
              <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/60 to-slate-900 border-none shadow-xl">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-green-500 to-emerald-400" />
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="rounded-full bg-green-500/20 p-3 shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <CardTitle className="text-lg font-semibold text-white">Vulnerability Templates</CardTitle>
                  </div>
                  <CardDescription className="text-slate-300">Browse and use vulnerability report templates</CardDescription>
                </CardHeader>
                <CardContent>
                  <VulnerabilityTemplates />
                </CardContent>
              </Card>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search programs..."
                  className="w-full px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-4 items-center">
                {/* Platform Filter */}
                <select
                  className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                >
                  <option value="all">All Platforms</option>
                  {platforms.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Data Table */}
            <div ref={tableRef}>
              <DataTable
                columns={columns}
                data={paginatedPrograms}
              />
              <div className="mt-4 flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 md:space-x-2 py-4">
                <div className="text-sm text-slate-400">
                  Showing {filteredPrograms.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredPrograms.length)} of{' '}
                  {filteredPrograms.length} programs
                </div>
                <div className="flex items-center space-x-1">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  {/* Smart Pagination Numbers */}
                  {(() => {
                    const pages = [];
                    const pageWindow = 2;
                    for (let i = 1; i <= totalPages; i++) {
                      if (
                        i === 1 ||
                        i === totalPages ||
                        (i >= currentPage - pageWindow && i <= currentPage + pageWindow)
                      ) {
                        pages.push(i);
                      } else if (
                        (i === currentPage - pageWindow - 1 && i > 1) ||
                        (i === currentPage + pageWindow + 1 && i < totalPages)
                      ) {
                        pages.push('ellipsis-' + i);
                      }
                    }
                    let lastWasEllipsis = false;
                    return pages.map((page, idx) => {
                      if (typeof page === 'string' && page.startsWith('ellipsis')) {
                        if (lastWasEllipsis) return null;
                        lastWasEllipsis = true;
                        return (
                          <span key={page} className="h-8 w-8 flex items-center justify-center text-xs text-slate-500">...</span>
                        );
                      } else {
                        lastWasEllipsis = false;
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page as number)}
                            className={`h-8 w-8 rounded-md text-xs font-medium mx-0.5 transition-colors duration-150
                              ${(page === currentPage)
                                ? 'bg-indigo-600 text-white shadow'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}
                              ${(page === currentPage) ? '' : 'hover:text-white'}`}
                            disabled={page === currentPage}
                          >
                            {page}
                          </button>
                        );
                      }
                    });
                  })()}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 