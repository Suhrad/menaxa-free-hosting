'use client';

import { useEffect, useState } from 'react';

interface DashboardProps {
  profile: {
    world: string;
    role: string;
  };
}

interface MenuItem {
  id: string;
  title: string;
  icon: string;
  category: 'web2' | 'web3' | 'common';
}

const menuItems: MenuItem[] = [
  { id: 'web3-threats', title: 'Web3 Threats', icon: '🔗', category: 'web3' },
  { id: 'releases', title: 'Releases', icon: '🚀', category: 'web3' },
  { id: 'vulnerabilities', title: 'Vulnerabilities', icon: '🛡️', category: 'web3' },
  { id: 'cve', title: 'CVE', icon: '🔍', category: 'web2' },
  { id: 'eol', title: 'EOL', icon: '⏰', category: 'web2' },
  { id: 'data-leaks', title: 'Data Leaks', icon: '🔐', category: 'web2' },
  { id: 'news', title: 'News', icon: '📰', category: 'common' },
];

export default function Dashboard({ profile }: DashboardProps) {
  const [orderedMenuItems, setOrderedMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    let items: MenuItem[] = [];
    const web3Items = menuItems.filter(item => item.category === 'web3');
    const web2Items = menuItems.filter(item => item.category === 'web2');
    const commonItems = menuItems.filter(item => item.category === 'common');

    if (profile.world === 'web2') {
      items = [...web2Items, ...web3Items, ...commonItems];
    } else if (profile.world === 'web3') {
      items = [...web3Items, ...web2Items, ...commonItems];
    } else {
      // Both
      items = [...web3Items, ...web2Items, ...commonItems];
    }

    setOrderedMenuItems(items);
  }, [profile.world]);

  const getGreeting = () => {
    const roleGreetings = {
      developer: 'Your Security Development Hub',
      researcher: 'Your Security Research Center',
      founder: 'Your Product Security Hub',
      learner: 'Your Security Learning Center',
    };
    return roleGreetings[profile.role as keyof typeof roleGreetings] || 'Security Command Center';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-white">{getGreeting()}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {orderedMenuItems.map((item, index) => (
            <div
              key={item.id}
              className={`p-6 rounded-xl border border-gray-700 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-700/50 transition-all duration-300 ${
                index === 0 ? 'md:col-span-2 lg:col-span-3' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{item.icon}</span>
                <h2 className="text-xl font-semibold text-white">{item.title}</h2>
              </div>
              {/* Placeholder for content */}
              <div className="mt-4 space-y-2">
                <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
                <div className="h-4 bg-gray-700/50 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 