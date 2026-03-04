import {getSupabaseClient} from '../../lib/supabase'

import { IOrganization, OrganizationModel } from '../models/organization.model'

export class OrganizationRepository {

    //get all organizations
    async getAll(): Promise<OrganizationModel[]> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from(process.env.NEXT_PUBLIC_SUPABASE_ORG_TABLES || '')
            .select('*').order('created_at', { ascending: false })
        console.log('Supabase response:', { data, error })
        if (error) {
            console.error('Error fetching organizations:', error)
            throw new Error('Failed to fetch organizations')
        }

        return (data || []).map((item: IOrganization) => new OrganizationModel(item))
    }

    async getById(id: string): Promise<OrganizationModel | null> {
        const supabase = getSupabaseClient()
        console.log(id, "is it good?")
        const {data, error} = await supabase
            .from(process.env.NEXT_PUBLIC_SUPABASE_ORG_TABLES || 'osc')
            .select('*')
            .eq('id_osc', id)
            .single()
        if (error) {
            console.error(`Error fetching organization with id ${id}:`, error)
            throw new Error('Failed to fetch organization')
        }
        return data ? new OrganizationModel(data) : null
    }

    // ✅ Fixed: added .eq('id_osc', organization.id_osc) so UPDATE has a WHERE clause
    async update(organization: IOrganization): Promise<OrganizationModel> {
        const supabase = getSupabaseClient()
        const { id_osc, ...fields } = organization as any
        const { data, error } = await supabase
        .from(process.env.NEXT_PUBLIC_SUPABASE_ORG_TABLES || 'osc')
        .update(fields)
        .eq('id_osc', id_osc)
        .select()
        .single()
        if (error) {
        console.error('Error updating organization:', error)
        throw new Error('Failed to update organization')
        }
        return new OrganizationModel(data)
    }

    async setDirection(id_osc: string, id_direccion: string): Promise<OrganizationModel> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from(process.env.NEXT_PUBLIC_SUPABASE_ORG_TABLES || 'osc')
            .update({ id_direccion })
            .eq('id_osc', id_osc)
            .select()
            .single()

        if (error) {
            console.error('Error setting direction for organization:', error)
            throw new Error('Failed to set direction for organization')
        }
        return new OrganizationModel(data)
    }

}

export const organizationRepository = new OrganizationRepository()