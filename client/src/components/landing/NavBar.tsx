import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { LucideMenu, LucideX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeContext } from '@/components/ThemeProvider';
import { LucideMoon, LucideSun } from 'lucide-react';

export const NavBar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { theme, toggleTheme, isDark } = useThemeContext();

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const navbarClasses = `fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
    isScrolled
      ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm'
      : 'bg-transparent'
  }`;

  const navLinks = [
    { name: 'Features', path: '/features' },
    { name: 'Pricing', path: '/pricing' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location === path;

  return (
    <nav className={navbarClasses}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/">
            <div className="flex items-center space-x-2 cursor-pointer">
              <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-semibold">S</div>
              <span className="text-xl font-bold dark:text-white">SynthralOS</span>
            </div>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link 
                key={link.path} 
                href={link.path}
                className={`font-medium ${
                  isActive(link.path)
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400'
                } transition-colors`}
              >
                {link.name}
              </Link>
            ))}
            
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 rounded-full"
              aria-label="Toggle theme"
            >
              {isDark ? <LucideSun className="h-5 w-5" /> : <LucideMoon className="h-5 w-5" />}
            </button>
            
            <Button variant="outline" className="mr-2" asChild>
              <Link href="/login">Log In</Link>
            </Button>
            <Button className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700" asChild>
              <Link href="/register">Sign Up</Link>
            </Button>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center space-x-4">
            <button 
              onClick={toggleTheme}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 rounded-full"
              aria-label="Toggle theme"
            >
              {isDark ? <LucideSun className="h-5 w-5" /> : <LucideMoon className="h-5 w-5" />}
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-slate-800 dark:text-white"
              aria-label="Toggle mobile menu"
            >
              {isMobileMenuOpen ? <LucideX className="h-6 w-6" /> : <LucideMenu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="md:hidden bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
          >
            <div className="container mx-auto px-4 py-4">
              <div className="flex flex-col space-y-4">
                {navLinks.map((link) => (
                  <Link 
                    key={link.path} 
                    href={link.path}
                    className={`py-2 px-4 rounded-md ${
                      isActive(link.path)
                        ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                        : 'text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                ))}
                
                <div className="pt-2 flex flex-col space-y-3">
                  <Button variant="outline" onClick={() => setIsMobileMenuOpen(false)} asChild>
                    <Link href="/login">Log In</Link>
                  </Button>
                  <Button onClick={() => setIsMobileMenuOpen(false)} asChild>
                    <Link href="/register">Sign Up</Link>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};