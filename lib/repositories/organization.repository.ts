import {getSupabaseClient} from '../../lib/supabase'

import { IOrganization, OrganizationModel } from '../models/organization.model'

export class OrganizationRepository {

    //get all organizations
    async getAll(): Promise<OrganizationModel[]> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('osc')
            .select('*').order('created_at', { ascending: false })
        console.log('Supabase response:', { data, error })
        if (error) {
            console.error('Error fetching organizations:', error)
            throw new Error('Failed to fetch organizations')
        }

        return (data || []).map((item: IOrganization) => new OrganizationModel(item))
    }
}

export const organizationRepository = new OrganizationRepository()