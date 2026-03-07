// /lib/repositories/bank_account.repository.ts 
// funcion para manejar la logica de acceso a datos para las cuentas bancarias, 
// permite obtener y actualizar cuentas bancarias en la base de datos utilizando Supabase
import {getSupabaseClient} from '../../lib/supabase'

import { IBankAccount, BankAccountModel} from '../models/bank-account.model'

export class BankAccountRepository{
    
    // funcion para obtener la cuenta de banco de una organizacion mediante su ID
    async getByIdPersona(id: string): Promise<BankAccountModel | null>{
        const supabase = getSupabaseClient();
        const {data, error} = await supabase
            .from('cuenta_banco')
            .select('*')
            .eq('id_persona', id)
            .single()
        if (error) {
            console.error(`Error fetching bank account with id ${id}:`, error)
            throw new Error('Failed to fetch bank account')
        }
        return data ? new BankAccountModel(data) : null      
    }

    //funcion para actualizar una cuenta de banco
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