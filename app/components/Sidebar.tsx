'use client';

import { useEffect, useState } from 'react';
import SidebarMenu from './SidebarMenu';

export default function Sidebar() {
  const [world, setWorld] = useState<'web2' | 'web3' | 'both' | undefined>(undefined);

  useEffect(() => {
    const userInterest = localStorage.getItem('userInterest');
    if (userInterest === 'web2' || userInterest === 'web3' || userInterest === 'both') {
      setWorld(userInterest);
    } else {
      setWorld('web3'); // fallback if not set
    }
  }, []);

  if (!world) {
    return null; // Optionally, show a loading spinner here
  }

  return (
    <div className="w-64 h-screen bg-black border-r border-gray-800 lg:border-r-0 lg:fixed lg:top-0 lg:left-0 lg:h-screen lg:w-64 lg:z-40 lg:bg-black">
      <div className="p-4 lg:p-6">
         <div className="mb-8 flex items-center justify-center">
         <h1 className="text-2xl font-extrabold text-gray-100 tracking-wide">MENAXA</h1>
      </div>
      <SidebarMenu world={world} />
      </div>
    </div>
  );
} 