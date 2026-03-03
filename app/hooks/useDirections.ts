import {useState, useEffect, useCallback} from 'react';
import { directionRepository } from '@/lib/repositories/direction.repository';
import { DirectionModel } from '@/lib/models/direction.model';
import { getSupabaseClient } from '@/lib/supabase';

export function useDirections() {
    const [directions, setDirections] = useState<DirectionModel[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [user , setUser] = useState<any>(null);
    const [supabase, setSupabase] = useState<any>(null);


    
    useEffect(() => {
        const initializeSupabase = async () => {
            const supabaseClient = getSupabaseClient();
            setSupabase(supabaseClient);
            setUser(await supabaseClient.auth.getUser());
            if (user) {
                setUser(user);
            }
        };
        initializeSupabase();
    });

    const upsertDirection = useCallback(async (direction: DirectionModel) => {
        try {
            setLoading(true);
            const updatedDirection = await directionRepository.upsert(direction);
        } catch (err) {
            console.error('Error upserting direction:', err);
            setError('Failed to upsert direction');
        }
        finally {
            setLoading(false);
        }
    }, []);

    const fetchDirectionById = useCallback(async (id: string) => {
        

        try {
            setLoading(true);
            const direction = await directionRepository.getById(id);
            console.log(direction, "direction in fetchDirectionByIdUser")
            return direction;
        }
        catch (err) {
            console.error(`Error fetching direction with id ${id}:`, err);
            setError('Failed to fetch direction');
            return null;
        }   
        finally {
            setLoading(false);
        }
    }, [ ]);

    const fetchDirectionByIdUser = useCallback(async (id: string) => {
        

        try {
            setLoading(true);
            const direction = await directionRepository.getById(id);
            
            return direction;
        }
        catch (err) {
            console.error(`Error fetching direction with id ${id}:`, err);
            setError('Failed to fetch direction');
            return null;
        }   
        finally {
            setLoading(false);
        }
    }, []);

    return {
        directions,
        loading,
        error,
        fetchDirectionById,
        upsertDirection,
    };

}