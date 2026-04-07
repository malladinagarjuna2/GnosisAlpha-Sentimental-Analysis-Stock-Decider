import { useEffect, useState, useCallback } from 'react';
import { AxiosError } from 'axios';

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: AxiosError | null;
}

export const useFetch = <T,>(
  fn: () => Promise<{ data: T }>,
  dependencies: any[] = []
): UseFetchState<T> & { refetch: () => Promise<void> } => {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const refetch = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const response = await fn();
      setState({ data: response.data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error as AxiosError,
      });
    }
  }, [fn]);

  useEffect(() => {
    refetch();
  }, dependencies);

  return {
    ...state,
    refetch,
  };
};
