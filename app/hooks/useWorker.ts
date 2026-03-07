// /hooks/useWorker.ts
// Este hook personalizado se encarga de manejar la lógica relacionada con el trabajador autenticado,
// incluye la obtención del userId del trabajador, la carga del trabajador asociado a ese userId,
// utilizando el repositorio de trabajadores y el cliente de Supabase para la autenticación y gestión de sesiones.

import { workerRepository } from "@/lib/repositories/worker.repository";
import { WorkerModel } from "@/lib/models/worker.model";
import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export function useWorker(){

    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [worker, setWorker] = useState<WorkerModel | null>(null);
    const [userId, setUserId] = useState<string | null>(null);

    // paso 1: resolver el userId una vez al montar el hook
    useEffect(() => {
        const init = async () => {
        const client = getSupabaseClient();
        const { data, error } = await client.auth.getSession();
        const user = data?.session?.user;
        if (error) console.error('[useWorker] auth error:', error);
        if (user) {
            console.log('[useWorker] userId =>',user.id);
            setUserId(user.id);
        } else {
            console.warn('[useWorker] no authenticated user');
            setLoading(false);
        }
        };
        init();
    }, []);


    // paso 2: una vez que el userId está resuelto, cargar el trabajador asociado a ese userId
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