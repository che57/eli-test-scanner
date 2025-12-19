import { useCheckHealthQuery } from '@/store/api/testStripsApi';

export function useBackendHealth() {
  const { data, isLoading, error } = useCheckHealthQuery(undefined, {
    refetchOnMountOrArgChange: true,
    refetchOnReconnect: true,
    pollingInterval: 30_000,
  });

  return {
    data: data?.status ?? '',
    loading: isLoading,
    error: error ? (error as Error).message : null,
  };
}
