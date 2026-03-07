// hooks/useDirections.ts
// Este hook personalizado se encarga de manejar la lógica relacionada con las direcciones, 
// incluyendo la carga de una dirección por su ID y la función para actualizar o crear una dirección, 
// utilizando el repositorio de direcciones para interactuar con la base de datos y manejar estados de carga y error.

import { useState, useCallback } from 'react';
import { directionRepository } from '@/lib/repositories/direction.repository';
import { DirectionModel } from '@/lib/models/direction.model';

export function useDirections() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // hook para obtener una dirección por su ID
  // se puede usar tanto para cargar la dirección de la organización en el perfil 
  // como para cargar la dirección de un usuario en su perfil
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

  // hook para actualizar o crear una dirección
  // si el objeto dirección tiene un id, se actualiza, si no, se crea una nueva 
  // dirección
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