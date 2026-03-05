import {getSupabaseClient} from '../../lib/supabase'
import { IAnnouncement, AnnouncementModel } from '../models/announcement.model'

export class AnnouncementRepository{

    async getAll(id : string): Promise<AnnouncementModel[]> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('avisos')
            .select('*').order('created_at', { ascending: false })
            .eq('id_osc', id)
        console.log('Supabase response:', { data, error }) 
        if (error) {
            throw new Error(error.message);
        }
        return data as AnnouncementModel[];
    }

    async update(announcement: IAnnouncement): Promise<AnnouncementModel> {
        const supabase = getSupabaseClient()
        const { id_aviso, ...fields } = announcement as any
        const { data, error } = await supabase
            .from('avisos')
            .update(fields)
            .eq('id_aviso', id_aviso)
            .select()
            .single()
        if (error) {
            console.error('Error updating announcement:', error)
            throw new Error('Failed to update announcement')
        }
        return new AnnouncementModel(data)
    }

    async create(announcement: IAnnouncement): Promise<AnnouncementModel> {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('avisos')
            .insert(announcement)
            .select()
            //.eq('id_aviso', announcement.id_aviso)
            .single()
        if (error) {
            console.error('Error creating announcement:', error)
            throw new Error('Failed to create announcement')
        }
        return new AnnouncementModel(data)
    }

}

export const announcementRepository = new AnnouncementRepository();