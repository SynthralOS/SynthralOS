import React, { createContext, useContext, ReactNode } from 'react';
import { useTheme } from '@/hooks/use-theme';

interface ThemeContextType {
  theme: 'dark' | 'light' | 'system';
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  setSystemTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useTheme();
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  
  return context;
}
