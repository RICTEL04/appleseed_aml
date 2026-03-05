import { workerRepository } from "@/lib/repositories/worker.repository";
import { WorkerModel } from "@/lib/models/worker.model";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export function useWorker(){

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [worker, setWorker] = useState<WorkerModel | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

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


    // Step 2: fetch bank account once userId is ready
    useEffect(() => {
        if (!userId) return;
        console.log('[useWorker] userId =>', userId);
        const run = async () => {
            try {
                setLoading(true);
                console.log('[useWorker] fetching worker...');
                const account = await workerRepository.getById(userId);
                console.log('[useWorker] account =>', account);
                setWorker(account);
            setError(null);
            } catch (err) {
            console.error('[useWorker] fetch error:', err);
            setError('Failed to fetch worker');
            } finally {
            setLoading(false);
            }
        };
        run();
    }, [userId]);


    return { worker, loading, error };
}
