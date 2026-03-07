// lib/repositories/announcement.repository.ts
// esta clase se encarga de manejar la logica de acceso a datos para los avisos,
// permite obtener, crear, y actualizar avisos en la base de datos utilizando Supabase

import {getSupabaseClient} from '../../lib/supabase'
import { IAnnouncement, AnnouncementModel } from '../models/announcement.model'

export class AnnouncementRepository{

    // funcion para obtener todos los avisos de una organizacion, recibe el id de la organizacion como parametro,
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

    //funcion para actualizar un aviso existente, recibe un objeto de tipo IAnnouncement con los campos a actualizar,
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

    //funcion para crear un nuevo aviso, recibe un objeto de tipo IAnnouncement con los datos del nuevo aviso
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

    //funcion para crear multiples avisos, 
    async createMany(announcements: IAnnouncement[]): Promise<AnnouncementModel[]> {
        const supabase = getSupabaseClient();
        const results: AnnouncementModel[] = [];
        for (const announcement of announcements) {
            const { data, error } = await supabase
                .from('avisos')
                .insert(announcement)
                .select()
                .single();
            if (error) {
                console.error('Error creating announcement:', error);
                throw new Error('Failed to create announcement');
            }
            results.push(new AnnouncementModel(data));
        }
        return results;
    }

}

export const announcementRepository = new AnnouncementRepository();