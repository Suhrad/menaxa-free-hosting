'use client';

import React, { useEffect, useState } from 'react';

interface SidebarMenuProps {
  world: 'web2' | 'web3' | 'both';
}

const MENU = {
  dashboard: { id: 'dashboard', label: 'Dashboard', icon: '🏠', href: '/' },
  web3Threats: { id: 'web3-threats', label: 'Web3 Threats', icon: '🔗', href: '/web3-threats' },
  releases: { id: 'releases', label: 'Releases', icon: '🚀', href: '/releases' },
  vulnerabilities: { id: 'vulnerabilities', label: 'Vulnerabilities', icon: '🛡️', href: '/vulnerabilities' },
  tools: { id: 'tools', label: 'Tools', icon: '🛠️', href: '/tools' },
  cve: { id: 'cve', label: 'CVE', icon: '🔍', href: '/cve' },
  eol: { id: 'eol', label: 'EOL', icon: '⏰', href: '/eol' },
  dataLeaks: { id: 'data-leaks', label: 'Data Leaks', icon: '🔐', href: '/data-leaks' },
  news: { id: 'news', label: 'News', icon: '📰', href: '/news' },
  aptGroups: { id: 'apt-groups', label: 'APT Groups', icon: '🌍', href: '/apt-groups' },
  programs: { id: 'programs', label: 'Bug Bounty', icon: '🎯', href: '/programs' },
};

function getMenuOrder(world: 'web2' | 'web3' | 'both') {
  if (world === 'web3') {
    return [
      [MENU.dashboard, MENU.web3Threats, MENU.releases, MENU.vulnerabilities, MENU.tools, MENU.programs, MENU.aptGroups, MENU.news],
      [MENU.cve, MENU.eol, MENU.dataLeaks],
    ];
  } else if (world === 'web2') {
    return [
      [MENU.dashboard, MENU.cve, MENU.eol, MENU.dataLeaks, MENU.tools, MENU.programs, MENU.aptGroups, MENU.news],
      [MENU.web3Threats, MENU.releases, MENU.vulnerabilities],
    ];
  } else {
    // both
    return [[
      MENU.dashboard,
      MENU.web3Threats,
      MENU.releases,
      MENU.vulnerabilities,
      MENU.tools,
      MENU.programs,
      MENU.cve,
      MENU.eol,
      MENU.dataLeaks,
      MENU.news,
      MENU.aptGroups,
    ]];
  }
}

export default function SidebarMenu({ world }: SidebarMenuProps) {
  const menuGroups = getMenuOrder(world);
  return (
    <nav className="flex flex-col gap-2">
      {menuGroups.map((group, i) => (
        <div key={`group-${i}`} className="flex flex-col">
          {i > 0 && <div className="my-2 border-t border-slate-700" />}
          {group.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors text-sm lg:text-base"
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          ))}
        </div>
      ))}
     
      <div className="mt-4 border-t border-slate-700 pt-4 flex flex-col items-center gap-4">
        <div className="flex justify-center gap-4 w-full">
          <a
            href="https://discord.gg/a9qvDeVz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img src="/discord.png" alt="Discord" className="h-6 w-6 lg:h-7 lg:w-7" />
          </a>
          <a
            href="https://x.com/Menaxa_xyz"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img src="/X.png" alt="X" className="h-5 w-5 lg:h-6 lg:w-6" />
          </a>
        </div>
      </div>
      <div className="mt-auto">
        <a
          href="https://menaxa.gitbook.io/menaxa"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-center w-full text-slate-100 py-2 px-4 rounded-lg hover:bg-slate-700 transition-colors text-base lg:text-lg"
        >
          📚 Docs
        </a>
      </div>
    </nav>
  );
}