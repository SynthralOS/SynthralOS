import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useThemeContext } from '@/components/ThemeProvider';
import { 
  SunIcon, 
  MoonIcon, 
  NotificationIcon, 
  HelpIcon,
  MenuIcon 
} from '@/lib/icons';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Sidebar } from '@/components/Sidebar';

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const [location] = useLocation();
  const { toggleTheme, isDark } = useThemeContext();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  const pageTitle = title || getPageTitle(location);
  
  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-20">
      <div className="flex items-center space-x-2">
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden" 
          onClick={() => setIsMobileSidebarOpen(true)}
        >
          <MenuIcon className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">{pageTitle}</h1>
      </div>
      
      <div className="flex items-center space-x-3">
        {/* Theme Toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {isDark ? (
            <SunIcon className="h-5 w-5" />
          ) : (
            <MoonIcon className="h-5 w-5" />
          )}
        </Button>
        
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative">
          <NotificationIcon className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-3 w-3 bg-primary-500 rounded-full"></span>
        </Button>
        
        {/* Help */}
        <Button variant="ghost" size="icon">
          <HelpIcon className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Mobile Sidebar */}
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <SheetContent side="left" className="p-0">
          <Sidebar mobile onClose={() => setIsMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}

// Helper function to get the page title based on the current route
function getPageTitle(path: string): string {
  switch (true) {
    case path === '/':
      return 'Home';
    case path === '/dashboard':
      return 'Dashboard';
    case path === '/builder':
      return 'Workflow Builder';
    case path.startsWith('/builder/'):
      return 'Workflow Editor';
    case path === '/templates':
      return 'Templates Gallery';
    case path === '/integrations':
      return 'Integrations';
    case path === '/settings':
      return 'Settings';
    case path === '/executions':
      return 'Workflow Executions';
    case path.startsWith('/ai/'):
      return 'AI Tools';
    default:
      return 'SynthralOS';
  }
}
