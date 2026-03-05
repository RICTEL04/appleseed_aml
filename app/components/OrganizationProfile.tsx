"use client"

import { useState, useEffect, useRef } from 'react';
import { Building2, CreditCard, Share2, CheckCircle, Copy, Eye, MapPin } from 'lucide-react';

import { DirectionForm } from './DirectionForm';
import { BankAccountForm, BankAccountData } from '../components/BankAccountForm';

import { DirectionModel, IDirection } from '@/lib/models/direction.model';
import { OrganizationModel } from '@/lib/models/organization.model';
import { BankAccountModel } from '@/lib/models/bank-account.model';

import { useOrganizations } from '../hooks/useOrganizations';
import { useDirections } from '../hooks/useDirections';
import { useBankAccount } from '../hooks/useBankAccount';

interface OrganizationFormData {
  description: string;
  direction?: Partial<IDirection>;
  bankAccount: BankAccountData;
  isComplete: boolean;
}

function Spinner() {
  return <span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin inline-block" />;
}

function FieldSkeleton({ wide = false }: { wide?: boolean }) {
  return <div className={`h-11 bg-gray-100 rounded-lg animate-pulse ${wide ? 'w-full' : 'w-2/3'}`} />;
}

export function OrganizationProfile() {
  const { organization, loadingProfile: orgLoading, updateOrganization, setDirectionById } = useOrganizations();
  const { fetchDirectionById, upsertDirection, loading: directionLoading } = useDirections();
  const { bankAccount, loading: bankLoading, upsertBankAccount } = useBankAccount();

  const [organizationId, setOrganizationId] = useState('');
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [directionError, setDirectionError] = useState('');
  const [bankError, setBankError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Local direction model (needs separate fetch once org is ready)
  const [directionModel, setDirectionModel] = useState<DirectionModel | null>(null);
  const [directionFetched, setDirectionFetched] = useState(false);

  // Editable form state (separate from read-only org fields)
  const [formData, setFormData] = useState<OrganizationFormData>({
    description: '',
    direction: undefined,
    bankAccount: { bankName: '', accountHolder: '', accountNumber: '', clabe: '' },
    isComplete: false,
  });

  useEffect(() => {
    setOrganizationId(localStorage.getItem('organization_id') || '');
    setOrigin(window.location.origin);
  }, []);

  // Once org loads, populate description and fetch direction
  useEffect(() => {
    if (!organization) return;
    setFormData(prev => ({ ...prev, description: organization.actividades_principales }));
  }, [organization]);

  // Fetch direction once we have the org's direction ID
  useEffect(() => {
    if (!organization?.id_direccion || directionFetched) return;
    setDirectionFetched(true);
    fetchDirectionById(organization.id_direccion).then(dir => {
      if (dir) {
        setDirectionModel(dir);
        setFormData(prev => ({
          ...prev,
          direction: {
            id_direccion: dir.id_direccion,
            calle: dir.calle || '',
            num_exterior: dir.num_exterior || '',
            num_interior: dir.num_interior || null,
            cp: dir.cp || '',
            entidad_federativa: dir.entidad_federativa || '',
            ciudad_alcaldia: dir.ciudad_alcaldia || '',
          },
        }));
      }
    });
  }, [organization, directionFetched, fetchDirectionById]);

  // Populate bank form once bank account loads from hook
  useEffect(() => {
    if (!bankAccount) return;
    setFormData(prev => ({
      ...prev,
      bankAccount: {
        bankName: bankAccount.banco,
        accountHolder: bankAccount.titular,
        accountNumber: bankAccount.num_cuenta,
        clabe: bankAccount.clabe,
      },
    }));
  }, [bankAccount]);

  // ── Validation ────────────────────────────────────────────────────────────────
  const validateDirection = (dir?: Partial<IDirection>): boolean => {
    if (!dir) { setDirectionError('La dirección es requerida'); return false; }
    const required: (keyof IDirection)[] = ['calle', 'num_exterior', 'cp', 'entidad_federativa', 'ciudad_alcaldia'];
    for (const field of required) {
      if (!dir[field] || String(dir[field]).trim() === '') {
        setDirectionError(`La dirección requiere ${field.replace('_', ' ')}`);
        return false;
      }
    }
    if (dir.cp && !/^\d{5}$/.test(dir.cp)) { setDirectionError('El código postal debe tener 5 dígitos'); return false; }
    return true;
  };

  const validateBank = (bank: BankAccountData): boolean => {
    if (!bank.bankName) { setBankError('Debe seleccionar un banco'); return false; }
    if (!bank.accountHolder) { setBankError('El titular de la cuenta es requerido'); return false; }
    if (!bank.accountNumber) { setBankError('El número de cuenta es requerido'); return false; }
    if (!bank.clabe || bank.clabe.length !== 18) { setBankError('La CLABE debe tener 18 dígitos'); return false; }
    return true;
  };

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDirection(formData.direction)) return;
    if (!validateBank(formData.bankAccount)) return;

    setIsSubmitting(true);
    try {
      const savedDir = await upsertDirection(new DirectionModel({
        id_direccion: directionModel?.id_direccion,
        calle: formData.direction!.calle!,
        num_exterior: formData.direction!.num_exterior!,
        num_interior: formData.direction!.num_interior || '',
        cp: formData.direction!.cp!,
        entidad_federativa: formData.direction!.entidad_federativa!,
        ciudad_alcaldia: formData.direction!.ciudad_alcaldia!,
      }));

      const savedBank = await upsertBankAccount(new BankAccountModel({
        id_cuenta_banco: bankAccount?.id_cuenta_banco,
        clabe: formData.bankAccount.clabe,
        num_cuenta: formData.bankAccount.accountNumber,
        banco: formData.bankAccount.bankName,
        titular: formData.bankAccount.accountHolder,
        id_persona: organization?.id_osc || null,
      }));

      if (savedDir && organization && savedDir.id_direccion) {
        // Link the new direction ID to the org row (this uses .eq('id_osc', ...) correctly)
        await setDirectionById(savedDir.id_direccion);

        // Update description separately — only send the fields that changed
        await updateOrganization(new OrganizationModel({
          ...organization,
          id_direccion: savedDir.id_direccion,
          actividades_principales: formData.description,
        }));

        setDirectionModel(savedDir);
        setFormData(prev => ({ ...prev, isComplete: true }));
        localStorage.setItem(`org_profile_${organizationId}`, JSON.stringify({ isComplete: true }));
      }
    } catch (err) {
      console.error('[OrganizationProfile] submit error:', err);
      setDirectionError('Error al guardar. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const donationLink = origin && organizationId ? `${origin}/donate/${organizationId}` : '';
  const isFormComplete = formData.bankAccount.bankName && formData.bankAccount.accountNumber &&
    formData.bankAccount.clabe && formData.bankAccount.accountHolder && formData.description;
  const isSaving = isSubmitting || directionLoading;
  const stillLoading = orgLoading || bankLoading;

  return (
    <div className="space-y-6 pb-2">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div className="xl:pr-4">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100 mb-2">
                Perfil de organización
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Perfil de Organización</h1>
              <p className="text-sm sm:text-base text-gray-600">Configure su información bancaria para recibir donaciones</p>
            </div>

            {formData.isComplete && (
              <div className="w-full xl:w-auto xl:min-w-[420px] xl:max-w-[520px] bg-emerald-50 rounded-xl p-3.5 sm:p-4 border border-emerald-200">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 text-white">
                    <Share2 className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm sm:text-base font-semibold text-emerald-900 mb-1">Link de donación listo para compartir</h2>
                    <div className="bg-white rounded-lg p-2 border border-emerald-100">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <code className="flex-1 text-[11px] sm:text-xs break-all leading-relaxed text-emerald-900">{donationLink}</code>
                        <button
                          onClick={() => { navigator.clipboard.writeText(donationLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors flex items-center justify-center gap-1.5 flex-shrink-0 text-xs font-semibold text-white"
                        >
                          {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? 'Copiado' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-7">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900">Información General</h2>
            {orgLoading && <span className="ml-auto flex items-center gap-1 text-xs text-gray-400"><Spinner /> Cargando...</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Legal</label>
              {orgLoading ? <FieldSkeleton wide /> : (
                <textarea readOnly value={organization?.nombre_organizacion ?? ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none bg-gray-50 text-gray-700" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">RFC</label>
              {orgLoading ? <FieldSkeleton /> : (
                <textarea readOnly value={organization?.rfc ?? ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none bg-gray-50 text-gray-700" />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              {orgLoading ? <FieldSkeleton /> : (
                <textarea readOnly value={organization?.telefono ?? ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none bg-gray-50 text-gray-700" />
              )}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
              {orgLoading ? <FieldSkeleton wide /> : (
                <textarea readOnly value={organization?.email ?? ''}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg outline-none bg-gray-50 text-gray-700" />
              )}
            </div>

            {/* Direction */}
            <div className="sm:col-span-2">
              {orgLoading || (organization?.id_direccion && !directionFetched) ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Dirección Fiscal</h3>
                    <span className="ml-auto flex items-center gap-1 text-xs text-gray-400"><Spinner /> Cargando...</span>
                  </div>
                  <FieldSkeleton wide />
                  <div className="grid grid-cols-2 gap-3"><FieldSkeleton /><FieldSkeleton /><FieldSkeleton /><FieldSkeleton /></div>
                  <FieldSkeleton wide />
                </div>
              ) : (
                <DirectionForm value={formData.direction || {}} onChange={(d) => { setFormData(p => ({ ...p, direction: d })); setDirectionError(''); }} error={directionError} />
              )}
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Descripción de la Organización *</label>
              {orgLoading ? <FieldSkeleton wide /> : (
                <textarea name="description" required rows={4} value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                  placeholder="Breve descripción de la misión y actividades de la organización..." />
              )}
            </div>
          </div>
        </div>

        {/* Bank Info */}
        {bankLoading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-7">
            <div className="flex items-center gap-2 mb-6">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <h2 className="text-xl font-semibold text-gray-900">Información Bancaria</h2>
              <span className="ml-auto flex items-center gap-1 text-xs text-gray-400"><Spinner /> Cargando...</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FieldSkeleton /><FieldSkeleton /><FieldSkeleton /><FieldSkeleton />
            </div>
          </div>
        ) : (
          <BankAccountForm value={formData.bankAccount}
            onChange={d => { setFormData(p => ({ ...p, bankAccount: d })); setBankError(''); }}
            error={bankError} />
        )}

        <div className="flex justify-end pt-1">
          <button type="submit" disabled={!isFormComplete || isSaving || stillLoading}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition shadow-md shadow-emerald-600/25 flex items-center gap-2">
            {isSaving ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>) :
              (formData.isComplete ? 'Actualizar Información' : 'Guardar')}
          </button>
        </div>
      </form>
    </div>
  );
}