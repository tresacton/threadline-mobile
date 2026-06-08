import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api/client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (failureCount, error) => {
        // Don't retry auth/validation failures; do retry transient ones once.
        if (error instanceof ApiError && error.status < 500 && error.status !== 0) return false;
        return failureCount < 2;
      },
    },
  },
});
