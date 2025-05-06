import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { login as loginApi, logout as logoutApi, register as registerApi, getSession, updateUser as updateUserApi } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
  image?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
  name?: string;
}

export function useAuth() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch the session
  const { data: user, isLoading: isSessionLoading } = useQuery({
    queryKey: ['/api/auth/session'],
    queryFn: getSession,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isSessionLoading) {
      setIsLoading(false);
    }
  }, [isSessionLoading]);

  // Login mutation
  const { mutateAsync: loginMutation, isPending: isLoginPending } = useMutation({
    mutationFn: (credentials: LoginCredentials) => loginApi(credentials),
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/session'], data);
      toast({
        title: "Logged in",
        description: "You have been logged in successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Could not log in. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Register mutation
  const { mutateAsync: registerMutation, isPending: isRegisterPending } = useMutation({
    mutationFn: (credentials: RegisterCredentials) => registerApi(credentials),
    onSuccess: (data) => {
      toast({
        title: "Account created",
        description: "Your account has been created successfully. Please log in.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create account. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const { mutateAsync: logoutMutation, isPending: isLogoutPending } = useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/session'], null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message || "Could not log out. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const { mutateAsync: updateUserMutation, isPending: isUpdatePending } = useMutation({
    mutationFn: (userData: Partial<User>) => updateUserApi(userData),
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/session'], data);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const login = async (credentials: LoginCredentials) => {
    return loginMutation(credentials);
  };

  const register = async (credentials: RegisterCredentials) => {
    return registerMutation(credentials);
  };

  const logout = async () => {
    return logoutMutation();
  };

  const updateUser = async (userData: Partial<User>) => {
    return updateUserMutation(userData);
  };

  return {
    user,
    isLoading: isLoading || isSessionLoading,
    isLoginPending,
    isRegisterPending,
    isLogoutPending,
    isUpdatePending,
    login,
    register,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };
}
