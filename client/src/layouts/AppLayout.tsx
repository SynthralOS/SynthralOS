import React, { ReactNode, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  requireAuth?: boolean;
}

export function AppLayout({ children, title, requireAuth = true }: AppLayoutProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Use useEffect to handle navigation to avoid state updates during render
  useEffect(() => {
    // Redirect to login if authentication is required and user is not authenticated
    if (requireAuth && !isLoading && !isAuthenticated) {
      // Check if we're not already on the login page to avoid redirect loops
      if (location !== '/login') {
        setLocation('/login');
      }
    }
  }, [requireAuth, isLoading, isAuthenticated, location, setLocation]);
  
  // Show loading state while checking authentication
  if (requireAuth && isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }
  
  // Don't render protected content if not authenticated
  if (requireAuth && !isAuthenticated && !isLoading) {
    // Return null or loading state until the redirect happens
    return null;
  }
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:flex md:w-64 flex-col fixed inset-y-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-30">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <main className="flex-1 ml-0 md:ml-64 min-h-screen">
        <Header title={title} />
        <div className="flex-1 h-[calc(100vh-4rem)] overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
