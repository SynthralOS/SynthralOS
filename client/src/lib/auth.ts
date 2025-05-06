import { apiRequest } from "./queryClient";
import { queryClient } from "./queryClient";

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

interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
  image?: string;
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const res = await apiRequest("POST", "/api/auth/login", credentials);
  const user = await res.json();
  return user;
}

export async function register(credentials: RegisterCredentials): Promise<User> {
  const res = await apiRequest("POST", "/api/auth/register", credentials);
  const user = await res.json();
  return user;
}

export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout");
  queryClient.setQueryData(['/api/auth/session'], null);
}

export async function getSession(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/session", {
      credentials: "include",
    });
    
    if (res.ok) {
      return res.json();
    }
    
    return null;
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
}

export async function updateUser(data: Partial<User>): Promise<User> {
  const res = await apiRequest("PUT", "/api/users/me", data);
  const user = await res.json();
  
  // Update the session data in the query cache
  queryClient.setQueryData(['/api/auth/session'], user);
  
  return user;
}
