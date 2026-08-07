import { useState, useEffect, useCallback } from 'react';
import { getSocieties } from '../api/admin';
import { getErrorMessage } from '../utils/getErrorMessage';

export const useSocieties = (shouldFetch = true) => {
  const [societies, setSocieties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSocieties = useCallback(async () => {
    if (!shouldFetch) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSocieties();
      setSocieties(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch societies:', err);
      setError(getErrorMessage(err, 'Failed to load societies.'));
    } finally {
      setIsLoading(false);
    }
  }, [shouldFetch]);

  useEffect(() => {
    fetchSocieties();
  }, [fetchSocieties]);

  return {
    societies,
    isLoading,
    error,
    refetchSocieties: fetchSocieties,
  };
};

export default useSocieties;
