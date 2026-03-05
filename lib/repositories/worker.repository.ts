import {getSupabaseClient} from '../supabase'
import { IWorker, WorkerModel} from '../models/worker.model'

export class WorkerRepository{

    async getById(id: string): Promise<WorkerModel | null> {
        
        const supabase = getSupabaseClient()
        const {data, error} = await supabase
            .from('trabajador')
            .select('*')
            .eq('id_trabajador', id)
            .single()
        if (error) {
            console.error(`Error fetching worker with id ${id}:`, error)
            throw new Error('Failed to fetch worker')
        }
        return data ? new WorkerModel(data) : null
    }

}

export const workerRepository = new WorkerRepository();
