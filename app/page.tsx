'use client';

import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import DashboardLayout from './components/DashboardLayout';
import CinematicEntry from './components/CinematicEntry';
import ProfileBuilder from './components/ProfileBuilder';
import WelcomeMessage from './components/WelcomeMessage';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent
} from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Button } from './components/ui/button';
import { apiUrl } from './lib/api';

// News article interface
interface NewsArticle {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

// News API response interface
interface NewsApiResponse {
  last_updated: string;
  total_records: number;
  data: NewsArticle[];
}

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState<'entry' | 'profile' | 'welcome' | 'complete'>('entry');
  const [userProfile, setUserProfile] = useState<{ world: string; role: string } | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [eolData, setEolData] = useState({
    activeCount: 0,
    criticalCount: 0,
    expiredCount: 0
  });
  const [leaksData, setLeaksData] = useState({
    totalBreaches: 0,
    exposedRecords: 0,
    majorBreaches: 0
  });
  const [web3Data, setWeb3Data] = useState({
    vulnerabilitiesCount: 0,
    exploitsTotal: 0,
    recoveredFunds: 0,
    avgLossPerIncident: 0
  });

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding');
    const storedProfile = localStorage.getItem('userProfile');
    
    if (hasCompletedOnboarding && storedProfile) {
      setOnboardingStep('complete');
      setUserProfile(JSON.parse(storedProfile));
      // Set the world preference for menu ordering
      localStorage.setItem('userInterest', JSON.parse(storedProfile).world);
    }
  }, []);

  const handleCinematicComplete = () => {
    setOnboardingStep('profile');
  };

  const handleProfileComplete = (profile: { world: string; role: string }) => {
    setUserProfile(profile);
    setOnboardingStep('welcome');
    // Store the profile and completion status
    localStorage.setItem('userProfile', JSON.stringify(profile));
    localStorage.setItem('userInterest', profile.world);
  };

  const handleWelcomeComplete = () => {
    setOnboardingStep('complete');
    localStorage.setItem('hasCompletedOnboarding', 'true');
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch news data
        const newsResponse = await fetch(apiUrl('/news'));
        const newsData: NewsApiResponse = await newsResponse.json();
        setNewsArticles(newsData.data.slice(0, 5)); // Get only first 5 news items

        // Fetch EOL data summary
        const eolResponse = await fetch(apiUrl('/eol'));
        const eolData = await eolResponse.json();
        
        // Calculate EOL stats
        const eolItems = Object.values(eolData.data).flat();
        const today = new Date();
        const activeCount = eolItems.filter((item: any) => 
          item.eol === false || (typeof item.eol === 'string' && new Date(item.eol) > today)
        ).length;
        const criticalCount = eolItems.filter((item: any) => 
          typeof item.eol === 'string' && 
          new Date(item.eol) > today && 
          (new Date(item.eol).getTime() - today.getTime()) / (1000 * 60 * 60 * 24) < 30
        ).length;
        const expiredCount = eolItems.filter((item: any) => 
          typeof item.eol === 'string' && new Date(item.eol) < today
        ).length;

        setEolData({
          activeCount,
          criticalCount,
          expiredCount
        });

        // Fetch data leaks summary
        const leaksResponse = await fetch(apiUrl('/leaks'));
        const leaksData = await leaksResponse.json();
        const breaches = leaksData.data;
        
        setLeaksData({
          totalBreaches: breaches.length,
          exposedRecords: breaches.reduce((total: number, breach: any) => total + breach.leak_count, 0),
          majorBreaches: breaches.filter((breach: any) => breach.leak_count >= 1000000).length
        });

        // Fetch web3 data from rekt database
        const web3Response = await fetch(apiUrl('/web3-threats'));
        const web3Data = await web3Response.json();
        const exploits = web3Data.data;

        // Calculate total incidents and losses for all time periods
        const now = new Date();
        const threeMonthsAgo = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
        const sixMonthsAgo = new Date(now.getTime() - (180 * 24 * 60 * 60 * 1000));
        const oneYearAgo = new Date(now.getTime() - (365 * 24 * 60 * 60 * 1000));

        // Filter exploits for the last 3 months (matching Web3 Threats default view)
        const recentExploits = exploits.filter((exploit: any) => {
          const exploitDate = new Date(exploit.date);
          return exploitDate >= threeMonthsAgo;
        });

        // Calculate stats based on recent exploits (3M)
        const totalIncidents = recentExploits.length;
        const totalLosses = recentExploits.reduce((sum: number, exploit: any) => sum + (exploit.funds_lost ?? 0), 0);
        const avgLoss = totalIncidents > 0 ? totalLosses / totalIncidents : 0;

        setWeb3Data({
          vulnerabilitiesCount: 0, // not used in dashboard
          exploitsTotal: totalIncidents,
          recoveredFunds: totalLosses,
          avgLossPerIncident: avgLoss
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
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

  // Format large numbers
  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const formatBillionsOrMillions = (num: number): string => {
    if (num >= 1_000_000_000) {
      return `$${(num / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}B`;
    } else if (num >= 1_000_000) {
      return `$${(num / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
    }
    return `$${num.toLocaleString()}`;
  };

  return (
    <DashboardLayout>
      {onboardingStep === 'entry' && <CinematicEntry onComplete={handleCinematicComplete} />}
      {onboardingStep === 'profile' && <ProfileBuilder onComplete={handleProfileComplete} />}
      {onboardingStep === 'welcome' && userProfile && (
        <WelcomeMessage role={userProfile.role} onComplete={handleWelcomeComplete} />
      )}
      <div className="space-y-6">
        <div className="border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
            {userProfile ? `Hey ${
              userProfile.role === 'developer' ? 'Developer' :
              userProfile.role === 'researcher' ? 'Researcher' :
              userProfile.role === 'founder' ? 'Founder' :
              userProfile.role === 'learner' ? 'Learner' :
              'User'
            }, here's your Security Command Center` : 'Security Command Center'}
          </h1>
          <p className="text-slate-400">
            Enterprise threat intelligence, vulnerability tracking, and security posture monitoring
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-transparent animate-spin mb-4"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <p className="text-slate-400 mb-2">Loading intelligence data...</p>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="animate-pulse">•</span>
              <span>Fetching security alerts</span>
              <span className="animate-pulse">•</span>
              <span>Analyzing threat patterns</span>
              <span className="animate-pulse">•</span>
              <span>Updating dashboard</span>
            </div>
          </div>
        ) : (
          <>
            {/* Main Dashboard Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data Breach Card */}
              <Card className="bg-gradient-to-br from-amber-900/50 to-orange-900/50 border border-amber-800/50 hover:border-amber-700/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] transform">
                <CardHeader className="px-6 py-5 pb-4 border-b border-amber-800/50">
                  <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold flex items-center space-x-3">
                    <div className="rounded-full bg-amber-500/20 p-2 text-amber-400 flex-shrink-0 translate-y-[-2px]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <span className="text-amber-300">Data Breach Analytics</span>
                  </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-400/70">Last updated: {new Date().toLocaleTimeString()}</span>
                      <button className="p-1 rounded-full hover:bg-amber-800/30 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-amber-900/30 rounded-lg text-center hover:bg-amber-900/40 transition-colors group">
                      <div className="text-2xl font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">{formatNumber(leaksData.totalBreaches)}</div>
                      <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Total Incidents</div>
                    </div>
                    <div className="p-3 bg-amber-900/30 rounded-lg text-center hover:bg-amber-900/40 transition-colors group">
                      <div className="text-2xl font-bold text-amber-400 mb-1 group-hover:text-amber-300 transition-colors">{formatNumber(leaksData.majorBreaches)}</div>
                      <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Large-Scale Breaches</div>
                    </div>
                    <div className="p-3 bg-amber-900/30 rounded-lg text-center col-span-2 hover:bg-amber-900/40 transition-colors group">
                      <div className="text-2xl font-bold text-orange-400 mb-1 group-hover:text-orange-300 transition-colors">{formatNumber(leaksData.exposedRecords)}</div>
                      <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Records Compromised</div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-amber-800/50 pt-4">
                    <Link href="/data-leaks" className="w-full">
                      <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700 text-white border-none flex items-center justify-center gap-2 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        View Breach Database
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* EOL Card */}
              <Card className="bg-gradient-to-br from-rose-900/50 to-pink-900/50 border border-rose-800/50 hover:border-rose-700/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] transform">
                <CardHeader className="px-6 py-5 pb-4 border-b border-rose-800/50">
                  <div className="flex justify-between items-center">
                  <CardTitle className="text-lg font-semibold flex items-center space-x-3">
                    <div className="rounded-full bg-rose-500/20 p-2 text-rose-400 flex-shrink-0 translate-y-[-2px]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className="text-rose-300">End-of-Life Analysis</span>
                  </CardTitle>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-400/70">Last updated: {new Date().toLocaleTimeString()}</span>
                      <button className="p-1 rounded-full hover:bg-rose-800/30 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-6 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-rose-900/30 rounded-lg text-center hover:bg-rose-900/40 transition-colors group">
                      <div className="text-2xl font-bold text-white mb-1 group-hover:text-rose-300 transition-colors">{formatNumber(eolData.activeCount)}</div>
                      <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Supported Systems</div>
                    </div>
                    <div className="p-3 bg-rose-900/30 rounded-lg text-center hover:bg-rose-900/40 transition-colors group">
                      <div className="text-2xl font-bold text-rose-400 mb-1 group-hover:text-rose-300 transition-colors">{formatNumber(eolData.criticalCount)}</div>
                      <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Critical (30d Expiry)</div>
                    </div>
                    <div className="p-3 bg-rose-900/30 rounded-lg text-center col-span-2 hover:bg-rose-900/40 transition-colors group">
                      <div className="text-2xl font-bold text-pink-400 mb-1 group-hover:text-pink-300 transition-colors">{formatNumber(eolData.expiredCount)}</div>
                      <div className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Unsupported Systems</div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-rose-800/50 pt-4">
                    <Link href="/eol" className="w-full">
                      <Button size="sm" className="w-full bg-rose-600 hover:bg-rose-700 text-white border-none flex items-center justify-center gap-2 group">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        View EOL Dashboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Blockchain Security Card - Full Width */}
            <Card className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 border border-purple-800/50 hover:border-purple-700/50 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] transform mt-6">
              <CardHeader className="px-6 py-5 pb-4 border-b border-purple-800/50">
                <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-semibold flex items-center space-x-3">
                  <div className="rounded-full bg-purple-500/20 p-2 text-purple-400 flex-shrink-0 translate-y-[-2px]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-purple-300">Blockchain Security</span>
                  <Badge variant="default" className="ml-2 bg-purple-900/30 text-purple-300 border-purple-700">Last 3 Months</Badge>
                </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-purple-400/70">Last updated: {new Date().toLocaleTimeString()}</span>
                    <button className="p-1 rounded-full hover:bg-purple-800/30 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-6 py-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-purple-900/30 rounded-lg p-3 text-center hover:bg-purple-900/40 transition-colors group">
                    <p className="text-2xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">{formatBillionsOrMillions(web3Data.avgLossPerIncident)}</p>
                    <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Average Loss</p>
                  </div>
                  <div className="bg-purple-900/30 rounded-lg p-3 text-center hover:bg-purple-900/40 transition-colors group">
                    <p className="text-2xl font-bold text-purple-400 mb-1 group-hover:text-purple-300 transition-colors">{formatNumber(web3Data.exploitsTotal)}</p>
                    <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Total Incidents</p>
                  </div>
                  <div className="bg-purple-900/30 rounded-lg p-3 text-center hover:bg-purple-900/40 transition-colors group">
                    <p className="text-2xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">{formatBillionsOrMillions(web3Data.recoveredFunds)}</p>
                    <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">Total Losses</p>
                  </div>
                </div>
                <div className="mt-4 border-t border-purple-800/50 pt-4">
                  <Link href="/web3-threats" className="w-full">
                    <Button size="sm" className="w-full bg-purple-600 hover:bg-purple-700 text-white border-none flex items-center justify-center gap-2 group">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      View Blockchain Security
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Latest Security News with DataTable */}
            <Card className="overflow-hidden shadow-lg mt-6">
              <CardHeader className="bg-slate-800/50 px-6 py-5 pb-4 border-b border-slate-700">
                <CardTitle className="text-lg font-semibold flex items-center space-x-3">
                  <div className="rounded-full bg-blue-900/50 p-2 text-blue-500 flex-shrink-0 translate-y-[-2px]">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8m-2 12h-9l-2-3h11l2 3zm0-18v3m0 0h-3m3 0h3M10 9H7m0 0v3m0-3V6" />
                    </svg>
                  </div>
                  <span>Critical Security Alerts</span>
                </CardTitle>
                <CardDescription className="pt-1 pl-10">
                  Latest cybersecurity incidents and vulnerability notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* Table filtering options */}
                <div className="p-4 border-b border-slate-800 bg-slate-900/30 flex flex-wrap gap-4 items-center justify-between">
                  <div className="relative flex-grow max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input
                      type="text"
                      className="block w-full rounded-md bg-slate-800 border-slate-700 pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Search alerts..."
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <select className="rounded-md bg-slate-800 border-slate-700 py-2 pl-3 pr-8 text-sm text-white">
                      <option value="">All Sources</option>
                      {newsArticles.map((article, i) => (
                        <option key={i} value={article.source}>{article.source}</option>
                      )).filter((item, i, self) => 
                        self.findIndex(t => t.props.value === item.props.value) === i
                      )}
                    </select>
                    <select className="rounded-md bg-slate-800 border-slate-700 py-2 pl-3 pr-8 text-sm text-white">
                      <option value="desc">Newest First</option>
                      <option value="asc">Oldest First</option>
                    </select>
                  </div>
                </div>
                {/* Table content */}
                <div className="overflow-x-auto rounded-b-xl bg-slate-900/40">
                  <table className="w-full min-w-[600px]">
                    <thead className="sticky top-0 z-10 bg-slate-800/80 backdrop-blur border-b border-slate-700">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Source</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-300 uppercase tracking-wider">Title</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {newsArticles.map((article, index) => (
                        <tr 
                          key={index} 
                          className="hover:bg-blue-900/20 cursor-pointer transition-colors duration-150 group"
                          onClick={() => window.open(article.link, '_blank')}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-900/30 text-blue-300 text-xs font-semibold">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1M19 20a2 2 0 002-2V8m-2 12h-9l-2-3h11l2 3zm0-18v3m0 0h-3m3 0h3M10 9H7m0 0v3m0-3V6" />
                              </svg>
                              {article.source}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                            {formatDate(article.pubDate)}<span className="mx-1 text-slate-600">•</span>{formatTime(article.pubDate)}
                          </td>
                          <td className="px-6 py-4 text-sm max-w-xs truncate group-hover:underline" title={article.title}>
                              {article.title}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-800/30 border-t border-slate-800 flex justify-between items-center rounded-b-xl">
                  <div className="text-xs text-slate-400">
                    Showing {newsArticles.length} alerts
                  </div>
                  <Link href="/news">
                    <Button variant="outline" size="sm">
                      View Full Threat Intelligence Feed
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
} 
