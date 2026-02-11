'use client';

import { useEffect, useRef, useState } from 'react';

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const PROMPT_KEY = 'subPromptSeen';
const NOT_NOW_KEY = 'subPromptNotNowAt';
const FIVE_HOURS = 5 * 60 * 60 * 1000;

export default function EmailCaptureToast() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let t: number | undefined;
    let shouldShow = true;
    // Only show on non-dashboard pages
    if (window.location.pathname === '/' || window.location.pathname === '/dashboard') shouldShow = false;

    // Check if prompt has been seen or not now was clicked recently
    const seen = localStorage.getItem(PROMPT_KEY);
    const notNowAt = localStorage.getItem(NOT_NOW_KEY);
    if (seen === 'true' || (notNowAt && Date.now() - Number(notNowAt) < FIVE_HOURS)) {
      shouldShow = false;
    }

    if (shouldShow) {
      t = window.setTimeout(() => setShow(true), 10000);
    }
    return () => {
      if (t !== undefined) window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    let timeout: number | undefined;
    if (show) {
      timeout = window.setTimeout(() => setShow(false), 15000);
    }
    return () => {
      if (timeout !== undefined) window.clearTimeout(timeout);
    };
  }, [show]);

  const handleSubscribe = async () => {
    setError('');
    if (!validateEmail(email)) {
      setError('Please enter a valid email.');
      return;
    }
    // Simulate saving email (replace with API call if needed)
    try {
      await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubscribed(true);
      localStorage.setItem(PROMPT_KEY, 'true');
      setTimeout(() => setShow(false), 2000);
    } catch {
      setError('Failed to subscribe. Try again later.');
    }
  };

  const handleNotNow = () => {
    setShow(false);
    localStorage.setItem(NOT_NOW_KEY, Date.now().toString());
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl p-6 w-80 animate-fade-in flex flex-col gap-3"
        style={{ boxShadow: '0 4px 32px 0 #0008' }}>
        <div className="font-semibold text-white text-lg flex items-center gap-2">
          <span role="img" aria-label="mail">📬</span>
          Stay ahead of Web3 & Web2 threats.
        </div>
        <div className="text-gray-300 text-sm mb-2">
          Get weekly updates tailored to you — no spam.
        </div>
        {subscribed ? (
          <div className="text-green-400 font-semibold">You're subscribed!</div>
        ) : (
          <>
            <input
              type="email"
              className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            {error && <div className="text-red-400 text-xs">{error}</div>}
            <div className="flex gap-2 mt-2">
              <button
                className="flex-1 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
                onClick={handleSubscribe}
              >
                Subscribe
              </button>
              <button
                className="flex-1 py-2 rounded border border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-gray-400"
                onClick={handleNotNow}
              >
                Not now
              </button>
            </div>
          </>
        )}
      </div>
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.4s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
} 