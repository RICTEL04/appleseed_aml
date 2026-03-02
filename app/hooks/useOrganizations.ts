import {useState, useEffect, useCallback} from 'react';
import { organizationRepository } from '@/lib/repositories/organization.repository';
import { OrganizationModel } from '@/lib/models/organization.model';

export function useOrganizations() {
    const [organizations, setOrganizations] = useState<OrganizationModel[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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

    return { organizations, loading, error, refetch: fetchOrganizations };

}   