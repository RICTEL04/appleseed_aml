// hooks/useBankAccount.ts
// Este hook personalizado se encarga de manejar la lógica relacionada con la cuenta bancaria del trabajador autenticado,
// incluye la obtención del userId del trabajador, la carga de la cuenta bancaria asociada a ese userId,
// y una función para actualizar o crear la cuenta bancaria, todo esto utilizando el repositorio de cuentas bancarias
// y el cliente de Supabase para la autenticación y gestión de sesiones.
import { useState, useEffect, useCallback } from 'react';
import { bankAccountRepository } from '@/lib/repositories/bank_account.repository';
import { BankAccountModel } from '@/lib/models/bank-account.model';
import { getSupabaseClient } from '@/lib/supabase';

export function useBankAccount() {
  const [bankAccount, setBankAccount] = useState<BankAccountModel | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // paso 1: resolver el userId una vez al montar el hook
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

  // paso 2: una vez que el userId está resuelto, 
  // cargar la cuenta bancaria asociada a ese userId
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

  // hook para hacer upsert(create y update) de una cuenta de banco
  // si el usuario ya tiene una cuenta, se actualiza, si no, se crea una nueva
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