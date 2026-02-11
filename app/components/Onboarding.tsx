'use client';

import { useState, useEffect } from 'react';

interface OnboardingProps {
  onComplete: (interest: 'web2' | 'web3') => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const userInterest = localStorage.getItem('userInterest');
    if (!userInterest) {
      setShowModal(true);
    }
  }, []);

  const handleChoice = (interest: 'web2' | 'web3') => {
    localStorage.setItem('userInterest', interest);
    setShowModal(false);
    onComplete(interest);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2">
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-lg shadow-xl w-full max-w-xs sm:max-w-md md:max-w-lg mx-auto">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-center">Welcome to ThreatIntel</h2>
        <p className="text-gray-600 mb-4 sm:mb-6 text-center text-sm sm:text-base">
          What type of security threats are you most interested in?
        </p>
        <div className="flex flex-col space-y-3 sm:space-y-4">
          <button
            onClick={() => handleChoice('web2')}
            className="px-4 py-3 sm:px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base sm:text-lg"
          >
            Web2 Security Threats
          </button>
          <button
            onClick={() => handleChoice('web3')}
            className="px-4 py-3 sm:px-6 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-base sm:text-lg"
          >
            Web3 Security Threats
          </button>
        </div>
      </div>
    </div>
  );
} 