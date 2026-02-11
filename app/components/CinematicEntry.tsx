'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface CinematicEntryProps {
  onComplete: () => void;
}

export default function CinematicEntry({ onComplete }: CinematicEntryProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Show content after a short delay
    const contentTimer = setTimeout(() => {
      setShowContent(true);
    }, 150);

    // Remove completion timer - user will proceed manually

    return () => {
      clearTimeout(contentTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50">
      {/* Dashboard background with blur */}
      <div className="absolute inset-0 bg-[url('/dashboard-preview.png')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col items-center justify-center h-full space-y-8">
        {/* Larger Logo animation */}
        <div className="relative w-64 h-64 mb-8">
          <Image
            src="/Mlogo.png"
            alt="Menaxa Logo"
            fill
            className="object-contain animate-pulse"
            priority
          />
        </div>

        {showContent && (
          <div className="text-center space-y-4 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Welcome, anon 👋
            </h1>
            <p className="text-xl text-gray-300">
            Take control of your security intelligence. Menaxa is yours to command.
            </p>
            <button
              onClick={onComplete}
              className="mt-6 px-6 py-3 text-white bg-purple-600 hover:bg-purple-700 rounded-lg text-lg font-semibold transition duration-300 transform hover:scale-105 animate-glow"
            >
              Start exploring {'->'}
            </button>
          </div>
        )}
      </div>

      {/* Add animation keyframes */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
        }
        @keyframes glow {
          0% {
            box-shadow: 0 0 5px rgba(168, 85, 247, 0.4), 0 0 10px rgba(168, 85, 247, 0.4);
          }
          50% {
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.7), 0 0 30px rgba(168, 85, 247, 0.7);
          }
          100% {
            box-shadow: 0 0 5px rgba(168, 85, 247, 0.4), 0 0 10px rgba(168, 85, 247, 0.4);
          }
        }
        .animate-glow {
          animation: glow 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
} 
