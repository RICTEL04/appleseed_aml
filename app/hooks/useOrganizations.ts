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

    // Step 1: resolve userId once on mount
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

    // Step 2: fetch all organizations (no auth needed)
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

    // Step 3: fetch current user's organization once userId is ready
    useEffect(() => {
        if (!userId) return;
        const run = async () => {
        try {
            setLoading(true);
            console.log('[useOrganizations] fetching org for userId =>', userId);
            const org = await organizationRepository.getById(userId);
            console.log('[useOrganizations] org =>', org);
            setOrganization(org);
            setError(null);
        } catch (err) {
            console.error('[useOrganizations] getById error:', err);
            setError('Failed to fetch organization');
        } finally {
            setLoading(false);
        }
        };
        run();
    }, [userId]);

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