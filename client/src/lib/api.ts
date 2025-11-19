// API utility functions for making requests
import { queryClient } from "./queryClient";

export interface ApiError {
  message: string;
  status?: number;
}

export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = {
      message: "An error occurred",
      status: response.status,
    };
    
    try {
      const data = await response.json();
      error.message = data.message || error.message;
    } catch {
      error.message = response.statusText || error.message;
    }
    
    throw error;
  }

  return response.json();
}

// Helper functions for common API operations
export const api = {
  // GET request
  get: <T = any>(url: string) => apiRequest<T>(url, { method: "GET" }),

  // POST request
  post: <T = any>(url: string, data?: any) =>
    apiRequest<T>(url, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  // PATCH request
  patch: <T = any>(url: string, data?: any) =>
    apiRequest<T>(url, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  // DELETE request
  delete: <T = any>(url: string) =>
    apiRequest<T>(url, { method: "DELETE" }),

  // PUT request
  put: <T = any>(url: string, data?: any) =>
    apiRequest<T>(url, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),
};

// Invalidate queries helper
export function invalidateQueries(queryKey: string | string[]) {
  return queryClient.invalidateQueries({ 
    queryKey: Array.isArray(queryKey) ? queryKey : [queryKey] 
  });
}
