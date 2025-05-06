import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface User {
  id: number;
  email: string;
  name?: string;
  username?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useAuth() {
  const { 
    data: user, 
    isLoading, 
    isError 
  } = useQuery<User>({
    queryKey: ['/api/auth/session'],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  return {
    user,
    isLoading,
    isError,
    isAuthenticated: !!user,
  };
}