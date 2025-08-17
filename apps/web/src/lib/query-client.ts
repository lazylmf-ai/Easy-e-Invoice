import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (previously cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 401 (which redirects to login)
        if (error?.status >= 400 && error?.status < 500 && error?.status !== 401) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
});

// Query keys factory
export const queryKeys = {
  // Auth
  user: ['user'] as const,
  
  // Organization
  organization: ['organization'] as const,
  organizationProfile: () => [...queryKeys.organization, 'profile'] as const,
  
  // Invoices
  invoices: ['invoices'] as const,
  invoice: (id: string) => [...queryKeys.invoices, id] as const,
  invoicesList: (filters?: any) => [...queryKeys.invoices, 'list', filters] as const,
  
  // Templates
  templates: ['templates'] as const,
  template: (id: string) => [...queryKeys.templates, id] as const,
  
  // Buyers
  buyers: ['buyers'] as const,
  buyer: (id: string) => [...queryKeys.buyers, id] as const,
  
  // Validation
  validation: ['validation'] as const,
  validateTin: (tin: string) => [...queryKeys.validation, 'tin', tin] as const,
  
  // Health
  health: ['health'] as const,
} as const;