"use client"

import { useState, useEffect } from 'react';
import { Share2, CheckCircle, Copy } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

export function OrganizationDonations() {
  const [organizationId, setOrganizationId] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [origin, setOrigin] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [hasBankAccountConfigured, setHasBankAccountConfigured] = useState(false);
  const [checkingBankAccount, setCheckingBankAccount] = useState(true);

  useEffect(() => {
    setOrganizationId(localStorage.getItem('organization_id') || '');
    setOrganizationName(localStorage.getItem('organization_name') || '');
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkBankAccountConfiguration = async () => {
      setCheckingBankAccount(true);

      try {
        if (!isSupabaseConfigured) {
          if (isMounted) {
            setHasBankAccountConfigured(false);
            setCheckingBankAccount(false);
          }
          return;
        }

        const supabase = getSupabaseClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const activeOrganizationId = authData.user?.id || localStorage.getItem('organization_id') || '';

        if (!activeOrganizationId) {
          if (isMounted) {
            setHasBankAccountConfigured(false);
            setCheckingBankAccount(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from('cuenta_banco')
          .select('id_cuenta_banco')
          .eq('id_persona', activeOrganizationId)
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (isMounted) {
          setHasBankAccountConfigured(Boolean(data?.id_cuenta_banco));
        }
      } catch {
        if (isMounted) {
          setHasBankAccountConfigured(false);
        }
      } finally {
        if (isMounted) {
          setCheckingBankAccount(false);
        }
      }
    };

    void checkBankAccountConfiguration();

    return () => {
      isMounted = false;
    };
  }, []);

  const donationLink = origin && organizationId ? `${origin}/donacion/${organizationId}` : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(donationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Perfil de Organización</h1>
        <p className="text-gray-600">Configure su información bancaria para recibir donaciones</p>
      </div>

      {/* Donation Link Card - Only show if complete */}
      {!checkingBankAccount && hasBankAccountConfigured && (
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Share2 className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">¡Tu Link de Donación está Listo!</h2>
              <p className="text-emerald-50 mb-4">
                Comparte este enlace con tus donadores para recibir contribuciones
              </p>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-3">
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-sm break-all">{donationLink}</code>
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2 flex-shrink-0"
                  >
                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!checkingBankAccount && !hasBankAccountConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <p className="text-sm font-medium text-amber-800">
            La informacion bancaria de tu cuenta no esta registrada favor de ir a perfil a configurarla
          </p>
        </div>
      )}

    </div>
  );
}
