// ============================================================
// API Response Types
// ============================================================

/** Standard success response */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: PaginationMeta;
  requestId: string;
}

/** Standard error response */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
  };
}

/** Pagination metadata */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Paginated query params */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** Date range filter */
export interface DateRangeFilter {
  from?: string;
  to?: string;
}

/** Geo-proximity query */
export interface NearbyQuery {
  lng: number;
  lat: number;
  radiusMeters: number;
}

/** Auth tokens returned from login/refresh */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Login response (may require MFA) */
export interface LoginResponse {
  mfaRequired: boolean;
  mfaToken?: string;
  tokens?: AuthTokens;
  user?: import('./user').User;
}
