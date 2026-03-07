// /hooks/useOrganizations.ts
// Este hook personalizado se encarga de manejar la lógica relacionada con las organizaciones,
// incluyendo la carga de la organización del trabajador autenticado, la carga de todas las 
// organizaciones. También incluye funciones para actualizar la organización del trabajador autenticado y 
// para obtener todas las organizaciones con sus direcciones, utilizando el repositorio de organizaciones
import { useState, useEffect, useCallback } from 'react';
import { organizationRepository } from '@/lib/repositories/organization.repository';
import { OrganizationModel } from '@/lib/models/organization.model';
import { DirectionModel } from '@/lib/models/direction.model';
import { getSupabaseClient } from '@/lib/supabase';

export function useOrganizations() {

    
    // All organizations (for admin/list views)
    const [organizations, setOrganizations] = useState<OrganizationModel[]>([]);
    const [loadingAll, setLoadingAll] = useState<boolean>(true);

    // Current user's organization (for profile view)
    const [organization, setOrganization] = useState<OrganizationModel | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // paso 1: resolver el userId una vez al montar el hook
    useEffect(() => {
        const init = async () => {
        const client = getSupabaseClient();
        const { data, error } = await client.auth.getSession();
        const user = data?.session?.user;
        if (error) console.error('[useOrganizations] auth error:', error);
        if (user) {
            console.log('[useOrganizations] userId =>', user.id);
            setUserId(user.id);
        } else {
            console.warn('[useOrganizations] no authenticated user');
            setLoading(false);
        }
        };
        init();
    }, []);

    // paso 2: obtener todas las organizaciones una vez montado el hook, 
    // para cargar la lista de organizaciones en admin
    useEffect(() => {
        const run = async () => {
        try {
            setLoadingAll(true);
            const data = await organizationRepository.getAll();
            setOrganizations(data);
            setError(null);
        } catch (err) {
            console.error('[useOrganizations] getAll error:', err);
            setError('Failed to fetch organizations');
        } finally {
            setLoadingAll(false);
        }
        };
        run();
    }, []);

    // paso 3: una vez que el userId está resuelto, 
    // cargar la organización asociada a ese userId
    useEffect(() => {
        if (!userId) return;
        const run = async () => {
        try {
            setLoading(true);
            console.log('[useOrganizations] fetching org for userId =>', userId);
            const org = await organizationRepository.getById(userId);
            console.log('[useOrganizations] org =>', org);
            setOrganization(org);
        } catch (err) {
            console.error('[useOrganizations] getById error:', err);
            setOrganization(null);
        } finally {
            setLoading(false);
        }
        };
        run();
    }, [userId]);

    // hook para obtener todas las organizaciones con sus direcciones
    // se puede usar tanto para cargar la organización del perfil como 
    // para cargar la lista de organizaciones en admin
    const allOrganizationsWithDirections = useCallback(async (): Promise<[OrganizationModel, DirectionModel | null][]> => {
        try {
            setLoadingAll(true);   
            const data = await organizationRepository.getAllWithDirections();
            console.log('[useOrganizations] allOrganizationsWithDirections =>', data);
            return data;
        } catch (err) {
            console.error('[useOrganizations] getAllWithDirections error:', err);
            setError('Failed to fetch organizations with directions');
            return [];
        } finally {
            setLoadingAll(false);
        }
    }, []);
    
    // hook para actualizar la organización del trabajador autenticado
    // se puede usar para actualizar la organización del perfil del trabajador 
    // autenticado
    const updateOrganization = useCallback(async (org: OrganizationModel) => {
        try {
        setLoading(true);
        await organizationRepository.update(org);
        setOrganization(org);
        } catch (err) {
        console.error('[useOrganizations] update error:', err);
        setError('Failed to update organization');
        } finally {
        setLoading(false);
        }
    }, []);

    // hook para asignar una dirección a la organización del trabajador autenticado
    // se puede usar para asignar la dirección creada o actualizada al perfil de la 
    // organización del trabajador autenticado
    const setDirectionById = useCallback(async (id_direccion: string) => {
        if (!userId) return null;
        try {
        const updated = await organizationRepository.setDirection(userId, id_direccion);
        return updated;
        } catch (err) {
        console.error('[useOrganizations] setDirection error:', err);
        return null;
        }
    }, [userId]);

    return {
        // For list/admin views
        organizations,
        loading: loadingAll,
        // For profile view
        organization,
        loadingProfile: loading,
        // Shared
        error,
        updateOrganization,
        setDirectionById,
        allOrganizationsWithDirections
    };
}