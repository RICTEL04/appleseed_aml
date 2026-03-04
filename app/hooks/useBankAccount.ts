import {useState, useEffect, useCallback} from 'react';
import { bankAccountRepository } from '@/lib/repositories/bank_account.repository';
import { BankAccountModel , IBankAccount} from '@/lib/models/bank-account.model';
import { getSupabaseClient } from '@/lib/supabase';

export function useBankAccount(){
    const [bankAccount, setBankAccount] = useState<BankAccountModel | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [user , setUser] = useState<any>(null);
    const [supabase, setSupabase] = useState<any>(null);

    useEffect(() => {
        const initializeSupabase = async () => {
            const supabaseClient = getSupabaseClient();
            setSupabase(supabaseClient);
            const { data, error } = await supabaseClient.auth.getUser();
            if (data?.user) {
                setUser(data.user);
                console.log(data.user.id)
            }
        };
        initializeSupabase();
    }, []); // Only run once on mount


    const fetchBankAccount = useCallback(async () => {
        
        if (!user) return null;
        const id = user?.id;
        //console.log(id);
        try {
            setLoading(true);
            const bankAccount = await bankAccountRepository.getByIdPersona(id);
            console.log("Bank account", bankAccount)
            return bankAccount;
        } catch (err) {
            console.error(`Error fetching organization with id ${id}:`, err);
            setError(`Failed to fetch organization with id ${id}`);
            return null;
        } finally {            
            setLoading(false);
        }
        
    },   [user]);

    const upsertBankAccount = useCallback(async (bankAccount : BankAccountModel) => {
        
        const updatedBankAccount = null;
        try {
            setLoading(true);
            const updatedBankAccount = await bankAccountRepository.update(bankAccount);
            return updatedBankAccount;
        } catch (err) {
            console.error('Error upserting bank account:', err);
            setError('Failed to upsert bank account');
        }
        finally {
            setLoading(false);
            
        }

    }, []);

    return{loading, error, fetchBankAccount, upsertBankAccount}

}
