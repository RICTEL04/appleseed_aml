// hooks/useAnnouncement.ts
// Este hook personalizado se encarga de manejar la lógica relacionada con los avisos para el trabajador autenticado,
// incluye la obtención del userId del trabajador, la carga de los avisos asociados a ese userId,
// y funciones para actualizar, crear uno o varios avisos, todo esto utilizando el repositorio de avisos
// y el cliente de Supabase para la autenticación y gestión de sesiones.
import { useState, useEffect, useCallback } from 'react';
import { announcementRepository } from '@/lib/repositories/announcement.repository';
import { AnnouncementModel } from '@/lib/models/announcement.model';
import { getSupabaseClient } from '@/lib/supabase';

export function useAnnouncement(){
    
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [announcements, setAnnouncements] = useState<AnnouncementModel[]>([]);

    // paso 1: resolver el userId una vez al montar el hook
    useEffect(() => {
        const init = async () => {
        const client = getSupabaseClient();
        const { data, error } = await client.auth.getSession();
        const user = data?.session?.user;
        if (error) console.error('[useAnnouncement] auth error:', error);
        if (user) {
            console.log('[useAnnouncement] userId =>',user.id);
            setUserId(user.id);
        } else {
            console.warn('[useAnnouncement] no authenticated user');
            setLoading(false);
        }
        };
        init();
    }, []);

    // use effect para obtener todos los anuncios por usuario
    // se activa automaticamente
    useEffect(() => {
        if (!userId) return;
        const run = async () => {
            try {
                setLoading(true);
                console.log('[useAnnouncement] fetching announcements for userId =>', userId);
                const announ = await announcementRepository.getAll(userId);
                console.log('[useAnnouncement] announcements =>', announ);
                setError(null);
                setAnnouncements(announ);
            }
            catch (err) {
                console.error('[useAnnouncement] fetch error:', err);
                setError('Failed to fetch announcements');
            }
            finally {
                setLoading(false);
            }
        };
        run();
    }, [userId]);

    //hook para obtener todos los anuncios por usuario
    const fetchAnnouncements = useCallback(async () => {
        if (!userId) return [];
        try {
            setLoading(true);
            console.log('[useAnnouncement] fetching announcements for userId =>', userId);
            const announ = await announcementRepository.getAll(userId);
            console.log('[useAnnouncement] announcements =>', announ);
            setError(null);
            setAnnouncements(announ);
            return announ;
        } catch (err) {
            console.error('[useAnnouncement] fetch error:', err);
            setError('Failed to fetch announcements');
            return [];
        } finally {
            setLoading(false);
        }
    }, [userId]);

    //hook para actualizar un anuncio existente
    const updateAnnouncement = useCallback(async (announcement: AnnouncementModel) => {
        try {
            setLoading(true);
            const updated = await announcementRepository.update(announcement);
            setAnnouncements((prev) =>
                prev.map((a) => (a.id_aviso === updated.id_aviso ? updated : a))
            );
            return updated;
        } catch (err) {
            console.error('[useAnnouncement] update error:', err);
            setError('Failed to update announcement');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // hook para crear un anuncio desde cero
    // se puede usar para crear un anuncio individual o para crear 
    // los anuncios iniciales al crear una organización
    const createAnnouncement = useCallback(async (announcement: AnnouncementModel) => {
        try {
            setLoading(true);
            console.log('[useAnnouncement] creating announcement =>', announcement);
            const created = await announcementRepository.create(announcement);
            setAnnouncements((prev) => [...prev, created]);
            return created;
        } catch (err) {
            console.error('[useAnnouncement] create error:', err);
            setError('Failed to create announcement');
            return null;
        }
        finally {
            setLoading(false);
        }
    }, []);

    // hook para crear muchos anuncios al mismo tiempo
    // se puede usar para crear los anuncios iniciales al crear una organización
    // o para crear varios anuncios de golpe desde admin
    const createManyAnnouncements = useCallback(async (announcements: AnnouncementModel[]) => {
        try {
            setLoading(true);
            const created = await announcementRepository.createMany(announcements);
            setAnnouncements((prev) => [...prev, ...created]);
            return created;
        } catch (err) {
            console.error('[useAnnouncement] createMany error:', err);
            setError('Failed to create announcements');
            return [];
        }
        finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, announcements, 
            fetchAnnouncements, 
            updateAnnouncement, 
            createAnnouncement, 
            createManyAnnouncements };

 }