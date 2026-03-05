import { useState, useEffect, useCallback } from 'react';
import { announcementRepository } from '@/lib/repositories/announcement.repository';
import { AnnouncementModel } from '@/lib/models/announcement.model';
import { getSupabaseClient } from '@/lib/supabase';

export function useAnnouncement(){
    
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [announcements, setAnnouncements] = useState<AnnouncementModel[]>([]);

    // Step 1: resolve userId once on mount
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

    const createAnnouncement = useCallback(async (announcement: AnnouncementModel) => {
        try {
            setLoading(true);
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

    return { loading, error, announcements, fetchAnnouncements, updateAnnouncement, createAnnouncement };

 }