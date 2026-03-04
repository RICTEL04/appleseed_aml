import {getSupabaseClient} from '../../lib/supabase'

import { DirectionModel, IDirection } from '../models/direction.model'

export class DirectionRepository {

    async getById(id: string): Promise<DirectionModel | null> {
        const supabase = getSupabaseClient()
    
        const {data, error} = await supabase
            .from(process.env.NEXT_PUBLIC_SUPABASE_DIRECTION_TABLE || 'direccion')
            .select('*')
            .eq('id_direccion', id)
            .single()
        if (error) {
            console.error(`Error fetching direction with id ${id}:`, error)
            throw new Error('Failed to fetch direction')
        }
        return data ? new DirectionModel(data) : null
    }

    async upsert(direction: IDirection): Promise<DirectionModel> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from(process.env.NEXT_PUBLIC_SUPABASE_DIRECTION_TABLE || 'direccion')
            .upsert(direction)
            .select()
            .single()
        if (error) {
            throw new Error(error.message);
        }
        return new DirectionModel(data);
    }


}

export const directionRepository = new DirectionRepository()