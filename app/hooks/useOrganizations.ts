import {useState, useEffect, useCallback} from 'react';
import { organizationRepository } from '@/lib/repositories/organization.repository';
import { OrganizationModel } from '@/lib/models/organization.model';
import { getSupabaseClient } from '@/lib/supabase';
import { get } from 'http';

export function useOrganizations() {
    const [organizations, setOrganizations] = useState<OrganizationModel[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [user , setUser] = useState<any>(null);
    const [supabase, setSupabase] = useState<any>(null);
    

    
    useEffect(() => {
        const initializeSupabase = async () => {
            const supabaseClient = getSupabaseClient();
            setSupabase(supabaseClient);
            const { data, error } = await supabaseClient.auth.getUser();
            if (data?.user) {
                setUser(data.user);
                console.log(data.user.id)
            }
        };
        initializeSupabase();
    }, []); // Only run once on mount

    const fetchOrganizations = useCallback(async () => {
        
        try {
            setLoading(true);
            const data = await organizationRepository.getAll();
            setOrganizations(data);
            setError(null);
        } catch (err) {
            console.error('Error fetching organizations:', err);
            setError('Failed to fetch organizations');
        }
        finally {
            setLoading(false);
        }
        
        
    },   []);

    useEffect(() => {
        fetchOrganizations();
    }, [fetchOrganizations]);


    const updateOrganization = useCallback(async (organization: OrganizationModel) => {
        try {
            setLoading(true);
            const updatedOrg = await organizationRepository.update(organization);
        } catch (err) {
            console.error('Error updating organization:', err);
            setError('Failed to update organization');
        }
        finally {
            setLoading(false);
        }   
    }, []);

    const fetchOrganization = useCallback(async () => {
        const id = user?.id;
        console.log(id);
        try {
            setLoading(true);
            const organization = await organizationRepository.getById(id);
            return organization;
        } catch (err) {
            console.error(`Error fetching organization with id ${id}:`, err);
            setError(`Failed to fetch organization with id ${id}`);
            return null;
        } finally {            
            setLoading(false);
        }
    }, [user]);

    return { organizations, loading, error, refetch: fetchOrganizations, fetchOrganization };

}   