'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface ProfileBuilderProps {
  onComplete: (profile: { world: string; role: string }) => void;
}

const focusAreas = [
  {
    id: 'web3',
    title: 'Web3',
    icon: '🔗',
    description: 'Smart contracts, bridges, tokens, wallets',
    color: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'web2',
    title: 'Web2',
    icon: '🌐',
    description: 'CVEs, infrastructure, data leaks, legacy threats',
    color: 'from-blue-500/20 to-blue-600/20',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'both',
    title: 'Both',
    icon: '♾️',
    description: 'Blend of Web2 + Web3 intelligence',
    color: 'from-gray-500/20 to-gray-600/20',
    borderColor: 'border-gray-500/30',
  },
];

const roles = [
  {
    id: 'developer',
    title: 'Developer',
    icon: '🧑‍💻',
    description: 'You write code and want to avoid vulnerabilities.',
    color: 'from-blue-500/20 to-blue-600/20',
    borderColor: 'border-blue-500/30',
  },
  {
    id: 'researcher',
    title: 'Security Researcher',
    icon: '🕵️‍♂️',
    description: 'You hunt bugs, break things, and love digging deep.',
    color: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30',
  },
  {
    id: 'founder',
    title: 'Founder / Product Builder',
    icon: '🚀',
    description: 'You care about keeping your users and product safe.',
    color: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30',
  },
  {
    id: 'learner',
    title: 'Learner / Analyst',
    icon: '📚',
    description: "You're exploring and want to understand the landscape.",
    color: 'from-yellow-500/20 to-yellow-600/20',
    borderColor: 'border-yellow-500/30',
  },
];

export default function ProfileBuilder({ onComplete }: ProfileBuilderProps) {
  const [step, setStep] = useState<'focus' | 'role'>('focus');
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleFocusSelect = (focusId: string) => {
    setSelectedFocus(focusId);
    setStep('role');
  };

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
    if (selectedFocus) {
      onComplete({ world: selectedFocus, role: roleId });
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 px-2 sm:px-4">
      {/* Dashboard background with blur */}
      <div className="absolute inset-0 bg-[url('/dashboard-preview.png')] bg-cover bg-center opacity-10" />
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-lg sm:max-w-2xl md:max-w-4xl space-y-6 sm:space-y-8 p-2 sm:p-4 md:p-8 mx-auto">
        {step === 'focus' ? (
          <>
            <div className="text-center space-y-2 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                What area do you care about the most?
              </h2>
              <p className="text-base sm:text-xl text-gray-300">
                Pick your focus — we'll tailor everything to you.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {focusAreas.map((area) => (
                <motion.div
                  key={area.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 sm:p-6 rounded-xl border ${area.borderColor} bg-gradient-to-br ${area.color} backdrop-blur-md cursor-pointer transition-all duration-300 ${
                    selectedFocus === area.id ? 'ring-2 ring-white' : ''
                  }`}
                  onClick={() => handleFocusSelect(area.id)}
                >
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-4">{area.icon}</div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">
                    {area.title}
                  </h3>
                  <p className="text-gray-300 text-sm sm:text-base">{area.description}</p>
                </motion.div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="text-center space-y-2 sm:space-y-4">
              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                How do you see yourself here?
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {roles.map((role) => (
                <motion.div
                  key={role.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-4 sm:p-6 rounded-xl border ${role.borderColor} bg-gradient-to-br ${role.color} backdrop-blur-md cursor-pointer transition-all duration-300 ${
                    selectedRole === role.id ? 'ring-2 ring-white' : ''
                  }`}
                  onClick={() => handleRoleSelect(role.id)}
                >
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-4">{role.icon}</div>
                  <h3 className="text-lg sm:text-xl font-semibold text-white mb-1 sm:mb-2">
                    {role.title}
                  </h3>
                  <p className="text-gray-300 text-sm sm:text-base">{role.description}</p>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 