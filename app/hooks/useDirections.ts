import { useState, useCallback } from 'react';
import { directionRepository } from '@/lib/repositories/direction.repository';
import { DirectionModel } from '@/lib/models/direction.model';

export function useDirections() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectionById = useCallback(async (id: string | undefined) => {
    if (!id) return null;
    try {
      setLoading(true);
      console.log('[useDirections] fetching direction id =>', id);
      const direction = await directionRepository.getById(id);
      console.log('[useDirections] direction =>', direction);
      return direction;
    } catch (err) {
      console.error('[useDirections] fetch error:', err);
      setError('Failed to fetch direction');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const upsertDirection = useCallback(async (direction: DirectionModel) => {
    try {
      setLoading(true);
      const saved = await directionRepository.upsert(direction);
      return saved;
    } catch (err) {
      console.error('[useDirections] upsert error:', err);
      setError('Failed to upsert direction');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, fetchDirectionById, upsertDirection };
}