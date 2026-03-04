import { useState, useEffect, useCallback } from 'react';
import { bankAccountRepository } from '@/lib/repositories/bank_account.repository';
import { BankAccountModel } from '@/lib/models/bank-account.model';
import { getSupabaseClient } from '@/lib/supabase';

export function useBankAccount() {
  const [bankAccount, setBankAccount] = useState<BankAccountModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Step 1: resolve userId once on mount
  useEffect(() => {
    const init = async () => {
      const client = getSupabaseClient();
      const { data, error } = await client.auth.getUser();
      if (error) console.error('[useBankAccount] auth error:', error);
      if (data?.user) {
        console.log('[useBankAccount] userId =>', data.user.id);
        setUserId(data.user.id);
      } else {
        console.warn('[useBankAccount] no authenticated user');
        setLoading(false);
      }
    };
    init();
  }, []);

  // Step 2: fetch bank account once userId is ready
  useEffect(() => {
    if (!userId) return;
    const run = async () => {
      try {
        setLoading(true);
        console.log('[useBankAccount] fetching bank account...');
        const account = await bankAccountRepository.getByIdPersona(userId);
        console.log('[useBankAccount] account =>', account);
        setBankAccount(account);
        setError(null);
      } catch (err) {
        console.error('[useBankAccount] fetch error:', err);
        setError('Failed to fetch bank account');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [userId]);

  const upsertBankAccount = useCallback(async (account: BankAccountModel) => {
    try {
      setLoading(true);
      const saved = await bankAccountRepository.update(account);
      setBankAccount(saved);
      return saved;
    } catch (err) {
      console.error('[useBankAccount] upsert error:', err);
      setError('Failed to upsert bank account');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { bankAccount, loading, error, upsertBankAccount };
}