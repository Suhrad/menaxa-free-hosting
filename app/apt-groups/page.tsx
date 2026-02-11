'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import clsx from 'clsx';

interface APTGroup {
  Name: string;
  Aliases: string | null;
  Description: string;
  Origin: string;
}

const geoUrl = "https://unpkg.com/world-atlas@2.0.2/countries-110m.json";

export default function APTGroupsPage() {
  const [groups, setGroups] = useState<APTGroup[]>([]);
  const [highlightCountry, setHighlightCountry] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch('/api/Group');
        const data = await response.json();
        setGroups(data);
      } catch (error) {
        console.error('Error fetching APT groups:', error);
      }
    };
    fetchGroups();
  }, []);

  const filteredGroups = groups.filter(group =>
    group.Name.toLowerCase().includes(search.toLowerCase()) ||
    group.Origin.toLowerCase().includes(search.toLowerCase())
  );

  const countryGroups = filteredGroups.reduce((acc, group) => {
    const country = group.Origin;
    if (!acc[country]) acc[country] = [];
    acc[country].push(group);
    return acc;
  }, {} as Record<string, APTGroup[]>);

  const countries = Object.keys(countryGroups).sort();

  return (
    <DashboardLayout>
        <div className="border-b border-slate-700 pb-4">
        <h1 className="text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-pink-500">
            Advanced Persistent Threat (APT) Groups
          </h1>
          <p className="text-slate-400">
            Explore known APT groups, their aliases, and the countries they are associated with.
          </p>
        </div>

      <div className="relative flex w-full h-[800px] mt-6">
        <div className="w-full h-full">
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 150, center: [0, 20] }}
            style={{ width: '100%', height: '100%', display: 'block' }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const countryName = geo.properties.name;
                  const isHighlighted = highlightCountry === countryName;
                  const hasGroups = countryGroups[countryName]?.length > 0;
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      style={{
                        default: {
                          fill: isHighlighted
                            ? '#ef4444'
                            : '#000000',
                          stroke: '#1e293b',
                          strokeWidth: 1.5,
                          outline: 'none',
                          transition: 'fill 0.2s',
                        },
                        hover: {
                          fill: '#ef4444',
                          stroke: '#1e293b',
                          strokeWidth: 1.5,
                          outline: 'none',
                        },
                        pressed: {
                          fill: '#b91c1c',
                          stroke: '#1e293b',
                          strokeWidth: 1.5,
                          outline: 'none',
                        },
                      }}
                    />
                  );
                })
              }
            </Geographies>
          </ComposableMap>
        </div>

        <div className="h-full bg-slate-950/90 text-white w-[300px] overflow-y-auto shadow-lg p-4">
          <h2 className="text-2xl font-bold mb-4">APT Groups</h2>
          <div className="flex flex-wrap gap-2 items-center bg-slate-900/60 rounded-full px-3 py-2 shadow-sm mb-4">
            <div className="relative w-full">
              <span className="absolute left-3 top-1.5 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search APT groups..."
                className="pl-9 pr-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition w-full placeholder:text-slate-400"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-6">
            {countries.map((country) => (
              <div key={country}>
                <h3 className="text-lg font-semibold border-b border-slate-700 pb-1 mb-2">{country}</h3>
                <ul className="space-y-2">
                  {countryGroups[country].map((group) => (
                    <li
                      key={group.Name}
                      className={clsx(
                        'cursor-pointer px-3 py-2 rounded transition-colors',
                        highlightCountry === country && 'bg-red-700/60',
                        'hover:bg-red-800/80'
                      )}
                      onMouseEnter={() => setHighlightCountry(country)}
                      onMouseLeave={() => setHighlightCountry(null)}
                    >
                      <div className="font-bold text-base">{group.Name}</div>
                      {group.Aliases && (
                        <div className="text-xs text-slate-300">Aliases: {group.Aliases}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}