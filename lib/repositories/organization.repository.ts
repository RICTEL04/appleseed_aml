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

        const organizations = data || []
        const organizationIds = organizations
            .map((item: { id_osc?: string }) => item.id_osc)
            .filter((id): id is string => Boolean(id))

        let addressByUserId = new Map<string, string>()

        if (organizationIds.length > 0) {
            const { data: addressData, error: addressError } = await supabase
                .from('direccion')
                .select('id_user, calle, num_exterior, num_interior, cp, entidad_federetiva, ciudad_alcadia')
                .in('id_user', organizationIds)

            if (addressError) {
                console.error('Error fetching addresses:', addressError)
            } else {
                addressByUserId = new Map(
                    (addressData || []).map((address: {
                        id_user: string
                        calle?: string
                        num_exterior?: string
                        num_interior?: string
                        cp?: string
                        entidad_federetiva?: string
                        ciudad_alcadia?: string
                    }) => {
                        const location = [
                            [address.calle, address.num_exterior, address.num_interior].filter(Boolean).join(' '),
                            address.ciudad_alcadia,
                            address.entidad_federetiva,
                            address.cp ? `CP ${address.cp}` : undefined,
                        ]
                            .filter(Boolean)
                            .join(', ')

                        return [address.id_user, location]
                    }),
                )
            }
        }

        return organizations.map((item: Omit<IOrganization, 'direccion'> & { direccion?: string }) =>
            new OrganizationModel({
                ...item,
                direccion: addressByUserId.get(item.id_osc) || '',
            }),
        )
    }
}

export const organizationRepository = new OrganizationRepository()