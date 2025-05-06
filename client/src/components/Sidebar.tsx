import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { 
  HomeIcon, 
  WorkflowIcon, 
  TemplateIcon, 
  IntegrationIcon, 
  SettingsIcon, 
  ExecutionsIcon,
  LangChainIcon,
  OCRIcon,
  WebScraperIcon,
  LogoutIcon,
  SearchIcon,
  MonitorIcon,
  ChartIcon,
  BillingIcon,
  AgentIcon,
  TelemetryIcon,
  ActivityLogIcon,
  // UserPreferencesIcon - removed temporarily
} from '@/lib/icons';
import { Link2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface SidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

export function Sidebar({ mobile = false, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout, isLogoutPending } = useAuth();
  
  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: <HomeIcon /> },
    { href: '/builder', label: 'Workflows', icon: <WorkflowIcon /> },
    { href: '/templates', label: 'Templates', icon: <TemplateIcon /> },
    { href: '/integrations', label: 'Integrations', icon: <IntegrationIcon /> },
    { href: '/activity-log', label: 'Activity Log', icon: <ActivityLogIcon /> },
    { href: '/telemetry', label: 'Telemetry', icon: <TelemetryIcon /> },
    { href: '/settings', label: 'Settings', icon: <SettingsIcon /> },
    { href: '/executions', label: 'Executions', icon: <ExecutionsIcon /> },
    { href: '/usage', label: 'Usage Analytics', icon: <ChartIcon /> },
    { href: '/billing', label: 'Billing', icon: <BillingIcon /> },
  ];
  
  const aiTools = [
    { href: '/ai/agent-protocols', label: 'Agent Protocols', icon: <AgentIcon /> },
    { href: '/ai/guardrails', label: 'Guardrails', icon: <SettingsIcon /> },
    { href: '/ai/runtime-dashboard', label: 'Runtime Dashboard', icon: <ExecutionsIcon /> },
    { href: '/ai/memory-dashboard', label: 'Memory Dashboard', icon: <SearchIcon /> },
    { href: '/ai/rag-db-switch', label: 'RAG DB Switch', icon: <IntegrationIcon /> },
    { href: '/ai/langflow', label: 'Langflow Settings', icon: <Link2 className="h-5 w-5" /> },
    { href: '/ai/langflow-editor', label: 'Langflow Editor', icon: <Link2 className="h-5 w-5" /> },
    { href: '/ai/langchain', label: 'LangChain', icon: <LangChainIcon /> },
    { href: '/ai/ocr', label: 'OCR Tools', icon: <OCRIcon /> },
    { href: '/ai/scraper', label: 'Web Scraper', icon: <WebScraperIcon /> },
    { href: '/osint', label: 'OSINT Research', icon: <SearchIcon /> },
    { href: '/social-monitoring', label: 'Social Monitoring', icon: <MonitorIcon /> },
  ];

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-semibold">S</div>
          <span className="text-xl font-semibold">SynthralOS</span>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <a 
              className={`flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                location === item.href 
                  ? 'bg-slate-100 dark:bg-slate-800 text-primary-600 dark:text-primary-400' 
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
              onClick={mobile ? onClose : undefined}
            >
              <span className="h-5 w-5 mr-3">{item.icon}</span>
              {item.label}
            </a>
          </Link>
        ))}
        
        <div className="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
          <h3 className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Tools</h3>
          <div className="mt-2 space-y-1">
            {aiTools.map((item) => (
              <Link key={item.href} href={item.href}>
                <a 
                  className={`flex items-center px-2 py-2 rounded-md text-sm font-medium ${
                    location === item.href 
                      ? 'bg-slate-100 dark:bg-slate-800 text-primary-600 dark:text-primary-400' 
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                  onClick={mobile ? onClose : undefined}
                >
                  <span className="h-5 w-5 mr-3">{item.icon}</span>
                  {item.label}
                </a>
              </Link>
            ))}
          </div>
        </div>
      </nav>
      
      {/* User Profile */}
      {user && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user.image} />
              <AvatarFallback>
                {user.name ? user.name.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="ml-3">
              <p className="text-sm font-medium">{user.name || user.username}</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto" 
              onClick={handleLogout}
              disabled={isLogoutPending}
            >
              <LogoutIcon className="h-5 w-5 text-slate-400 hover:text-slate-500 dark:hover:text-slate-300" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
