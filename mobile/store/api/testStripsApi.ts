import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { Platform } from 'react-native';
import { BASE_BACKEND_URL, BASE_BACKEND_URL_ANDROID } from '@/config/env';

export interface UploadResponse {
  id: string;
  status: 'success' | 'error';
  qrCode?: string;
  qrCodeValid?: boolean;
  processedAt?: string;
  isExpired?: boolean;
  expirationYear?: number;
  message?: string;
}

export interface SubmissionItem {
  id: string;
  qrCode?: string;
  status: 'success' | 'error';
  thumbnailUrl?: string;
  createdAt: string;
  isExpired?: boolean;
  expirationYear?: number;
  errorMessage?: string;
}

const baseQuery = fetchBaseQuery({
  baseUrl: Platform.OS === 'android' ? BASE_BACKEND_URL_ANDROID : BASE_BACKEND_URL,
});

export interface HealthResponse {
  status: string;
}

export const testStripsApi = createApi({
  reducerPath: 'testStripsApi',
  baseQuery,
  tagTypes: ['Submissions'],
  endpoints: (builder) => ({
    checkHealth: builder.query<HealthResponse, void>({
      query: () => 'health',
    }),
    uploadPhoto: builder.mutation<UploadResponse, FormData>({
      query: (formData) => ({
        url: 'test-strips/upload',
        method: 'POST',
        body: formData,
      }),
      invalidatesTags: ['Submissions'],
    }),
    getSubmissions: builder.query<SubmissionItem[], { page?: number; limit?: number } | void>({
      query: (params) => {
        const page = params?.page || 1;
        const limit = params?.limit || 10;
        return `test-strips/list?page=${page}&limit=${limit}`;
      },
      transformResponse: (response: SubmissionItem[] | { submissions: SubmissionItem[] } | { items: SubmissionItem[] }) => {
        // support a few shapes the backend might return
        if (Array.isArray(response)) return response;
        if ('submissions' in response && Array.isArray(response.submissions)) return response.submissions;
        if ('items' in response && Array.isArray(response.items)) return response.items;
        return [];
      },
      providesTags: ['Submissions'],
    }),
  }),
});

export const { useCheckHealthQuery, useUploadPhotoMutation, useGetSubmissionsQuery } = testStripsApi;
