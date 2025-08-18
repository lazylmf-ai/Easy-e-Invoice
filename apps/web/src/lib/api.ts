import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// API client configuration
export const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      clearAuthToken();
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

// Auth token management
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

export const setAuthToken = (token: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('auth_token', token);
};

export const clearAuthToken = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
};

// API error types
export interface ApiError {
  error: string;
  message: string;
  details?: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  timestamp: string;
}

// API response types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  timestamp: string;
}

// Generic API request function
export const apiRequest = async <T = any>(
  config: AxiosRequestConfig
): Promise<T> => {
  try {
    const response = await apiClient.request<T>(config);
    return response.data;
  } catch (error: any) {
    // Re-throw with structured error
    throw {
      ...error.response?.data,
      status: error.response?.status,
      statusText: error.response?.statusText,
    } as ApiError & { status: number; statusText: string };
  }
};

// Specific API methods
export const api = {
  // Auth endpoints
  auth: {
    sendMagicLink: (email: string) =>
      apiRequest({
        method: 'POST',
        url: '/auth/magic-link',
        data: { email },
      }),
    
    verifyToken: (token: string) =>
      apiRequest({
        method: 'POST',
        url: '/auth/verify',
        data: { token },
      }),
    
    me: () =>
      apiRequest({
        method: 'GET',
        url: '/auth/me',
      }),
    
    logout: () =>
      apiRequest({
        method: 'POST',
        url: '/auth/logout',
      }),
  },

  // Organization endpoints
  organization: {
    get: () =>
      apiRequest({
        method: 'GET',
        url: '/org',
      }),
    
    update: (data: any) =>
      apiRequest({
        method: 'PUT',
        url: '/org',
        data,
      }),
    
    setup: (data: any) =>
      apiRequest({
        method: 'POST',
        url: '/org/setup',
        data,
      }),
    
    validateTin: (tin: string) =>
      apiRequest({
        method: 'POST',
        url: '/org/validate-tin',
        data: { tin },
      }),
  },

  // Invoice endpoints
  invoices: {
    list: (params?: string) =>
      apiRequest({
        method: 'GET',
        url: `/invoices${params ? `?${params}` : ''}`,
      }),
    
    get: (id: string) =>
      apiRequest({
        method: 'GET',
        url: `/invoices/${id}`,
      }),
    
    create: (data: any) =>
      apiRequest({
        method: 'POST',
        url: '/invoices',
        data,
      }),
    
    update: (id: string, data: any) =>
      apiRequest({
        method: 'PUT',
        url: `/invoices/${id}`,
        data,
      }),
    
    delete: (id: string) =>
      apiRequest({
        method: 'DELETE',
        url: `/invoices/${id}`,
      }),
    
    validate: (id: string) =>
      apiRequest({
        method: 'POST',
        url: `/invoices/${id}/validate`,
      }),
  },

  // Import endpoints
  import: {
    parseCSV: (csvData: string) =>
      apiRequest({
        method: 'POST',
        url: '/import/parse-csv',
        data: { csvData },
      }),
    
    importInvoices: (data: {
      csvData: string;
      columnMapping: Record<string, number>;
      hasHeaders?: boolean;
      validateOnly?: boolean;
      batchSize?: number;
    }) =>
      apiRequest({
        method: 'POST',
        url: '/import/invoices',
        data,
      }),
    
    startChunkedImport: (data: {
      csvData: string;
      columnMapping: Record<string, number>;
      hasHeaders?: boolean;
      validateOnly?: boolean;
      batchSize?: number;
    }) =>
      apiRequest({
        method: 'POST',
        url: '/import/start-chunked-import',
        data,
      }),
    
    getProgress: (importId: string) =>
      apiRequest({
        method: 'GET',
        url: `/import/progress/${importId}`,
      }),
    
    getTemplate: () =>
      apiRequest({
        method: 'GET',
        url: '/import/template',
        headers: {
          'Accept': 'text/csv',
        },
      }),
  },

  // Export endpoints
  export: {
    generatePDF: (data: {
      invoiceIds: string[];
      includeQrCode?: boolean;
      includeWatermark?: boolean;
      watermarkText?: string;
      format?: 'A4' | 'A5';
      language?: 'en' | 'ms';
    }) =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/export/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      }),

    generateJSON: (data: {
      invoiceIds: string[];
      format?: 'myinvois' | 'standard';
      includeLineItems?: boolean;
      minifyOutput?: boolean;
    }) =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/export/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      }),

    generateCSV: (data: {
      invoiceIds: string[];
      includeHeaders?: boolean;
      includeLineItems?: boolean;
      dateFormat?: 'ISO' | 'DD/MM/YYYY' | 'MM/DD/YYYY';
    }) =>
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/export/csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(data),
      }),

    startBatchExport: (data: {
      exportType: 'pdf' | 'json' | 'csv';
      invoiceIds: string[];
      options?: any;
      notifyOnComplete?: boolean;
    }) =>
      apiRequest({
        method: 'POST',
        url: '/export/batch',
        data,
      }),

    getJobStatus: (jobId: string) =>
      apiRequest({
        method: 'GET',
        url: `/export/jobs/${jobId}`,
      }),
  },

  // Template endpoints
  templates: {
    list: (params?: {
      page?: number;
      limit?: number;
      category?: string;
      search?: string;
      includePublic?: boolean;
      sortBy?: 'name' | 'createdAt' | 'usageCount';
      sortOrder?: 'asc' | 'desc';
    }) =>
      apiRequest({
        method: 'GET',
        url: '/templates',
        params,
      }),

    get: (id: string) =>
      apiRequest({
        method: 'GET',
        url: `/templates/${id}`,
      }),

    create: (data: {
      name: string;
      description?: string;
      category?: 'general' | 'professional-services' | 'retail' | 'manufacturing' | 'hospitality' | 'technology';
      isPublic?: boolean;
      templateData: any;
    }) =>
      apiRequest({
        method: 'POST',
        url: '/templates',
        data,
      }),

    update: (id: string, data: {
      name?: string;
      description?: string;
      category?: 'general' | 'professional-services' | 'retail' | 'manufacturing' | 'hospitality' | 'technology';
      isPublic?: boolean;
      templateData?: any;
    }) =>
      apiRequest({
        method: 'PUT',
        url: `/templates/${id}`,
        data,
      }),

    delete: (id: string) =>
      apiRequest({
        method: 'DELETE',
        url: `/templates/${id}`,
      }),

    use: (id: string) =>
      apiRequest({
        method: 'POST',
        url: `/templates/${id}/use`,
      }),

    getPresets: (category?: string) =>
      apiRequest({
        method: 'GET',
        url: '/templates/presets/industry',
        params: category ? { category } : undefined,
      }),

    getAnalytics: () =>
      apiRequest({
        method: 'GET',
        url: '/templates/analytics/usage',
      }),
  },

  // Health check
  health: () =>
    apiRequest({
      method: 'GET',
      url: '/health',
    }),
};