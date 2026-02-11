'use client';

import React, { useState, useEffect, cloneElement } from 'react';
import Sidebar from './Sidebar';
import { Menu, Bell, Sparkles, X, Shield, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Badge } from '@/app/components/ui/badge';

// Notification types and their icons
const NOTIFICATION_TYPES = {
  update: {
    icon: Sparkles,
    bgColor: 'bg-indigo-500/10',
    textColor: 'text-indigo-400'
  },
  security: {
    icon: Shield,
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-400'
  },
  alert: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-400'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-400'
  }
};

// Demo notifications
const notifications = [
  {
    id: 1,
    "title": "New: File Upload Cheatsheet is here 🚀",
    "description": "Dive into our exciting new File Upload Cheatsheet designed to supercharge your security analysis!",
    date: "Just now",
    isNew: true,
    type: "update",
    link: "/vulnerabilities"
  },
  {
    id: 2,
    "title": "New: New Vuln Report Templates!",
    "description": "Dive into our exciting new collection of vulnerability report templates designed to supercharge your security analysis!",
    date: "1 day ago",
    isNew: true,
    type: "update",
    link: "/programs"
  },
  {
    id: 3,
    title: "New: IDOR Cheatsheet is here 😉",
    description: "Check out our comprehensive IDOR vulnerability cheatsheet with real-world examples and prevention techniques.",
    date: "2 day ago",
    isNew: true,
    type: "update",
    link: "/vulnerabilities"
  },
  {
    id: 4,
    title: "Cetus Protocol Hack Alert",
    description: "Major security breach at Cetus Protocol. Learn about the attack vectors and implications.",
    date: "4 days ago",
    isNew: true,
    type: "security",
    link: "/web3-threats"
  }
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<number[]>([]);
  const [showNotificationTip, setShowNotificationTip] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const savedNotifications = localStorage.getItem('readNotifications');
    if (savedNotifications) {
      setReadNotifications(JSON.parse(savedNotifications));
    }
    const tipShown = localStorage.getItem('notificationTipShown');
    setShowNotificationTip(!tipShown);
  }, []);

  const unreadCount = notifications.filter(n => n.isNew && !readNotifications.includes(n.id)).length;

  const markAllAsRead = () => {
    const newReadNotifications = notifications.map(n => n.id);
    setReadNotifications(newReadNotifications);
    localStorage.setItem('readNotifications', JSON.stringify(newReadNotifications));
  };

  const dismissNotificationTip = () => {
    setShowNotificationTip(false);
    localStorage.setItem('notificationTipShown', 'true');
  };

  const getNotificationIcon = (type: string) => {
    const notificationType = NOTIFICATION_TYPES[type as keyof typeof NOTIFICATION_TYPES] || NOTIFICATION_TYPES.info;
    const IconComponent = notificationType.icon;
    return (
      <div className={`rounded-full p-2 ${notificationType.bgColor}`}>
        <IconComponent className={`h-4 w-4 ${notificationType.textColor}`} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black flex lg:flex-row flex-col">
      {/* Sidebar for desktop */}
      <div className="hidden lg:flex w-64 flex-shrink-0 h-screen bg-black border-r border-gray-800 z-40">
        <Sidebar />
      </div>

      {/* Sidebar for mobile (overlay) */}
      <div className={`fixed top-0 left-0 w-64 h-full bg-black border-r border-gray-800 z-50 transition-transform duration-300 lg:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
      </div>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 lg:p-8 relative">
        {/* Hamburger Button for mobile */}
        <Button
          variant="outline"
          size="default"
          className="lg:hidden fixed top-4 left-4 z-[60]"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <Menu className="h-6 w-6" />
        </Button>

        <div className="absolute top-4 right-4 z-50">
          <div className="relative">
            {isClient && showNotificationTip && unreadCount > 0 && (
              <div className="absolute top-12 right-0 w-[400px] bg-indigo-950/95 backdrop-blur-sm rounded-lg p-5 shadow-2xl border border-indigo-700 z-[70]">
                <div className="absolute top-[-6px] right-4 w-3 h-3 rotate-45 bg-indigo-950 border-r border-t border-indigo-700"></div>
                <div className="relative">
                  <h4 className="text-white font-semibold text-base mb-2 flex items-center gap-2">
                    <span role="img" aria-label="announcement">🔔</span>
                    Stay Updated!
                  </h4>
                  <p className="text-sm text-indigo-200 leading-relaxed">
                    Check your notification center for the latest alerts, hacks, and intel updates. Stay one step ahead.
                  </p>
                  <Button
                    size="sm"
                    className="w-full mt-4 bg-indigo-700 hover:bg-indigo-600 text-white transition-colors text-sm"
                    onClick={dismissNotificationTip}
                  >
                    Got it
                  </Button>
                </div>
              </div>
            )}
            <Button
              size="sm"
              className="relative bg-slate-900/50 border border-slate-700/50 hover:bg-slate-800/70 transition-all"
              onClick={() => {
                setNotificationsOpen(true);
                dismissNotificationTip();
              }}
            >
              <Bell className="h-6 w-6 text-indigo-400" />
              {isClient && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-indigo-500 rounded-full">
                  <span className="absolute inset-0 rounded-full animate-ping bg-indigo-500/50" />
                </span>
              )}
            </Button>
          </div>
        </div>

        {children}

        {/* Notification Dialog */}
        {notificationsOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-50 transition-opacity duration-200"
            onClick={() => setNotificationsOpen(false)}
          >
            <div 
              className="fixed top-[60px] right-4 lg:right-8 w-[90vw] max-w-[425px] transform transition-transform duration-200 ease-out"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg border border-slate-800 shadow-xl">
                <div className="p-4 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h2 className="text-lg font-semibold text-slate-200">Notifications</h2>
                      {isClient && unreadCount > 0 && (
                        <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
                          {unreadCount} new
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isClient && unreadCount > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-slate-400 hover:text-slate-300"
                          onClick={markAllAsRead}
                        >
                          Mark all as read
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-slate-400 hover:text-slate-300"
                        onClick={() => setNotificationsOpen(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-slate-800 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">
                      No notifications
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <a
                        key={notification.id}
                        href={notification.link}
                        className={`block p-4 hover:bg-slate-800/50 transition-colors ${
                          notification.isNew && !readNotifications.includes(notification.id)
                            ? 'bg-slate-800/20'
                            : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {getNotificationIcon(notification.type)}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-200">
                                {notification.title}
                              </p>
                              {notification.isNew && !readNotifications.includes(notification.id) && (
                                <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-medium">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              {notification.description}
                            </p>
                            <p className="text-xs text-slate-500 mt-2">
                              {notification.date}
                            </p>
                          </div>
                        </div>
                      </a>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                  <Button
                    size="sm"
                    className="w-full bg-slate-800/50 border-slate-700 hover:bg-slate-800 text-slate-300"
                  >
                    View all notifications
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}