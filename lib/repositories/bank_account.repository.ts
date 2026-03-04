import {getSupabaseClient} from '../../lib/supabase'

import { IBankAccount, BankAccountModel} from '../models/bank-account.model'

export class BankAccountRepository{
    
    async getByIdPersona(id: string): Promise<BankAccountModel | null>{
        const supabase = getSupabaseClient();
        const {data, error} = await supabase
            .from('cuenta_banco')
            .select('*')
            .eq('id_persona', id)
            .single()
        if (error) {
            console.error(`Error fetching organization with id ${id}:`, error)
            throw new Error('Failed to fetch organization')
        }
        return data ? new BankAccountModel(data) : null      
    }

    async update(bankAccount: IBankAccount): Promise<BankAccountModel>{
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
            .from('cuenta_banco')
            .upsert(bankAccount)
            .select()
            .single()
        if (error) {
            console.error('Error updating bankaccount:', error)
            throw new Error('Failed to update bankAccount')
        }
        return new BankAccountModel(data)
    }


}

export const bankAccountRepository = new BankAccountRepository();