// Common types used across the application

export interface User {
  id: string;
  email: string;
  orgId: string;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationResponse {
  page: number;
  limit: number;
  hasMore: boolean;
}