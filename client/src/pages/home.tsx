import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useThemeContext } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const [_, navigate] = useLocation();
  const { isDark } = useThemeContext();

  // Redirect to dashboard if authenticated
  React.useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-semibold text-xl">S</div>
            <span className="text-2xl font-bold">SynthralOS</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white font-medium">
              Login
            </Link>
            <Button asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-violet-600">
              Next-Gen AI Workflow Automation
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-10">
              SynthralOS combines advanced AI orchestration, no-code workflow building, OCR, scraping, and agent-driven automation in one powerful platform.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button size="lg" className="px-8" asChild>
                <Link href="/register">
                  Get Started
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="px-8" asChild>
                <Link href="/templates">
                  Browse Templates
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-slate-900">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              title="Visual Workflow Builder" 
              description="Create complex automation workflows with our intuitive drag-and-drop interface. No coding required." 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
              }
            />
            <FeatureCard 
              title="AI Orchestration" 
              description="Leverage advanced AI models and agents to automate complex tasks, process data, and make decisions." 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4 7 7 0 0 1-4 6 7 7 0 0 1-4-6 4 4 0 0 1 4-4z"></path>
                  <path d="M4.5 12.5a8 8 0 0 1 15 0"></path>
                  <line x1="12" y1="13" x2="12" y2="22"></line>
                  <line x1="9" y1="16" x2="15" y2="16"></line>
                </svg>
              }
            />
            <FeatureCard 
              title="OCR & Scraping" 
              description="Extract text from documents and images with OCR. Gather data from websites with our powerful scraping tools." 
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 10 4 15 9 20"></polyline>
                  <path d="M20 4v7a4 4 0 0 1-4 4H4"></path>
                </svg>
              }
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-500 to-violet-600 text-white">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to automate your workflows?</h2>
          <p className="text-xl mb-10 max-w-3xl mx-auto">
            Join thousands of users who are saving time and resources with SynthralOS.
          </p>
          <Button size="lg" variant="secondary" className="px-8" asChild>
            <Link href="/register">
              Start Your Free Trial
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-800 text-slate-300">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-6 md:mb-0">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-semibold">S</div>
                <span className="text-xl font-bold text-white">SynthralOS</span>
              </div>
              <p className="mt-2 text-sm">© 2025 SynthralOS. All rights reserved.</p>
            </div>
            <div className="flex space-x-6">
              <Link href="/about" className="hover:text-white">
                About
              </Link>
              <Link href="/docs" className="hover:text-white">
                Documentation
              </Link>
              <Link href="/pricing" className="hover:text-white">
                Pricing
              </Link>
              <Link href="/blog" className="hover:text-white">
                Blog
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Helper component for feature cards
function FeatureCard({ title, description, icon }: { title: string; description: string; icon: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="text-primary-500 mb-3">{icon}</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}