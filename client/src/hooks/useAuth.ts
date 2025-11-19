// Authentication hook using React Query
import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data, isLoading } = useQuery<{ user: User | null }>({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    queryFn: async () => {
      const res = await fetch("/api/auth/user", {
        credentials: "include",
      });

      // If 401, user is not authenticated - return null instead of throwing
      if (res.status === 401) {
        return { user: null };
      }

      if (!res.ok) {
        throw new Error(`Authentication check failed: ${res.status}`);
      }

      const responseData = await res.json();
      return { user: responseData.user || null };
    },
  });

  return {
    user: data?.user || null,
    isLoading,
    isAuthenticated: !!data?.user,
  };
}
