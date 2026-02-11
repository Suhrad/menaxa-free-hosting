'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface WelcomeMessageProps {
  role: string;
  onComplete: () => void;
}

const roleMessages: Record<string, string> = {
  developer: "You'll build defenses stronger than any attack.",
  researcher: "You'll track threats faster than they spread.",
  founder: "We'll help you stop losses before they happen.",
  learner: "You'll master security faster than threats evolve.",
};

export default function WelcomeMessage({ role, onComplete }: WelcomeMessageProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center space-y-6"
      >
        <h1 className="text-4xl md:text-6xl font-bold text-white">
          Welcome, {role.charAt(0).toUpperCase() + role.slice(1)}
        </h1>
        <p className="text-xl md:text-2xl text-gray-300">
          {roleMessages[role]}
        </p>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="mt-8"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </motion.div>
      </motion.div>
    </div>
  );
} 