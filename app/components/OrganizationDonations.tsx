// components/OrganizationDonations.tsx
// Este componente es el perfil de donaciones para las organizaciones, muestra un link de donación personalizado para 
// compartir, un historial detallado de donaciones recibidas con filtros de búsqueda y paginación, y una sección de donadores 
// frecuentes con alertas AML basadas en umbrales de monto donado en los últimos 6 meses, también permite copiar el link de 
// donación al portapapeles y muestra mensajes de confirmación.
"use client"

import { useState, useEffect, useMemo } from 'react';
import { Share2, CheckCircle, Copy, AlertTriangle, Search, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

const AML_THRESHOLD_1 = 181589.70;
const AML_THRESHOLD_2 = 363179.40;
const AML_MONTH_WINDOW = 6;
const DONATION_HISTORY_PAGE_SIZE = 15;
const DONOR_PAGE_SIZE = 15;

interface OrganizationDonation {
  id_donacion: string;
  cantidad: number;
  created_at: string;
  folio: string | null;
  Tipo: string | null;
  id_donante: string | null;
  donor_name: string;
  donor_rfc: string;
}

interface DonorAggregate {
  donorId: string;
  donorName: string;
  totalAmount: number;
  sixMonthAmount: number;
  monthlyAmounts: Record<string, number>;
}

interface DonorDetail {
  id_donante: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  fechaNacimiento: string;
  rfc: string;
  direccion: {
    calle: string;
    numExterior: string;
    numInterior: string;
    cp: string;
    entidadFederativa: string;
    ciudadAlcaldia: string;
  };
}

type DonationViewMode = 'history' | 'donors';
type DonorAlertFilter = 'all' | 'threshold1' | 'threshold2' | 'none';

export function OrganizationDonations() {
  const [organizationId, setOrganizationId] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [origin, setOrigin] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [hasBankAccountConfigured, setHasBankAccountConfigured] = useState(false);
  const [checkingBankAccount, setCheckingBankAccount] = useState(true);
  const [loadingDonationData, setLoadingDonationData] = useState(true);
  const [donationDataError, setDonationDataError] = useState('');
  const [organizationDonations, setOrganizationDonations] = useState<OrganizationDonation[]>([]);
  const [donorAggregates, setDonorAggregates] = useState<DonorAggregate[]>([]);
  const [monthKeys, setMonthKeys] = useState<string[]>([]);
  const [historySearchTerm, setHistorySearchTerm] = useState('');
  const [donorSearchTerm, setDonorSearchTerm] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [donorPage, setDonorPage] = useState(1);
  const [viewMode, setViewMode] = useState<DonationViewMode>('history');
  const [donorAlertFilter, setDonorAlertFilter] = useState<DonorAlertFilter>('all');
  const [donorDetailsById, setDonorDetailsById] = useState<Record<string, DonorDetail>>({});
  const [selectedDonorId, setSelectedDonorId] = useState<string>('');

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

  useEffect(() => {
    let isMounted = true;

    const getMonthKeys = () => {
      const months: string[] = [];
      const now = new Date();

      for (let index = AML_MONTH_WINDOW - 1; index >= 0; index -= 1) {
        const current = new Date(now.getFullYear(), now.getMonth() - index, 1);
        months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`);
      }

      return months;
    };

    const activeMonthKeys = getMonthKeys();

    const loadOrganizationDonationData = async () => {
      setLoadingDonationData(true);
      setDonationDataError('');
      setMonthKeys(activeMonthKeys);

      try {
        if (!isSupabaseConfigured) {
          throw new Error('Supabase no está configurado para consultar donaciones.');
        }

        const supabase = getSupabaseClient();
        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        const activeOrganizationId = authData.user?.id || localStorage.getItem('organization_id') || '';

        if (!activeOrganizationId) {
          if (isMounted) {
            setOrganizationDonations([]);
            setDonorAggregates([]);
          }
          return;
        }

        const { data: donations, error: donationsError } = await supabase
          .from('donaciones')
          .select('id_donacion, cantidad, created_at, folio, Tipo, id_donante')
          .eq('id_osc', activeOrganizationId)
          .order('created_at', { ascending: false });

        if (donationsError) {
          throw donationsError;
        }

        const donorIds = Array.from(
          new Set((donations ?? []).map((donation) => donation.id_donante).filter(Boolean)),
        );

        const donorById = new Map<string, DonorDetail>();

        if (donorIds.length > 0) {
          const { data: donors, error: donorsError } = await supabase
            .from('donantes')
            .select('id_donante, nombre, apellido_paterno, apellido_materno, rfc, email, telefono, fecha_nacimiento, id_direccion')
            .in('id_donante', donorIds);

          if (donorsError) {
            throw donorsError;
          }

          const directionIds = Array.from(
            new Set((donors ?? []).map((donor) => donor.id_direccion).filter(Boolean)),
          );

          const directionById = new Map<string, {
            calle: string;
            numExterior: string;
            numInterior: string;
            cp: string;
            entidadFederativa: string;
            ciudadAlcaldia: string;
          }>();

          if (directionIds.length > 0) {
            const { data: directions, error: directionsError } = await supabase
              .from('direccion')
              .select('id_direccion, calle, num_exterior, num_interior, cp, entidad_federativa, ciudad_alcaldia')
              .in('id_direccion', directionIds);

            if (directionsError) {
              throw directionsError;
            }

            (directions ?? []).forEach((direction) => {
              directionById.set(direction.id_direccion, {
                calle: direction.calle?.trim() || '',
                numExterior: direction.num_exterior?.trim() || '',
                numInterior: direction.num_interior?.trim() || '',
                cp: direction.cp?.trim() || '',
                entidadFederativa: direction.entidad_federativa?.trim() || '',
                ciudadAlcaldia: direction.ciudad_alcaldia?.trim() || '',
              });
            });
          }

          (donors ?? []).forEach((donor) => {
            const fullName = [donor.nombre, donor.apellido_paterno, donor.apellido_materno]
              .filter(Boolean)
              .join(' ')
              .trim();

            const direction = donor.id_direccion ? directionById.get(donor.id_direccion) : undefined;

            donorById.set(donor.id_donante, {
              id_donante: donor.id_donante,
              nombreCompleto: fullName || 'Donador sin nombre',
              rfc: donor.rfc?.trim() || 'Sin RFC',
              email: donor.email?.trim() || 'Sin correo',
              telefono: donor.telefono?.trim() || 'Sin teléfono',
              fechaNacimiento: donor.fecha_nacimiento || 'Sin fecha',
              direccion: {
                calle: direction?.calle || 'Sin calle',
                numExterior: direction?.numExterior || 'S/N',
                numInterior: direction?.numInterior || 'N/A',
                cp: direction?.cp || 'Sin CP',
                entidadFederativa: direction?.entidadFederativa || 'Sin entidad',
                ciudadAlcaldia: direction?.ciudadAlcaldia || 'Sin ciudad/alcaldía',
              },
            });
          });
        }

        const parsedDonations: OrganizationDonation[] = (donations ?? []).map((donation) => {
          const donorData = donation.id_donante ? donorById.get(donation.id_donante) : undefined;

          return {
            id_donacion: donation.id_donacion,
            cantidad: Number(donation.cantidad ?? 0),
            created_at: donation.created_at,
            folio: donation.folio,
            Tipo: donation.Tipo,
            id_donante: donation.id_donante,
            donor_name: donorData?.nombreCompleto || 'Donador no identificado',
            donor_rfc: donorData?.rfc || 'Sin RFC',
          };
        });

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - (AML_MONTH_WINDOW - 1));
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const aggregateMap = new Map<string, DonorAggregate>();

        parsedDonations.forEach((donation) => {
          if (!donation.id_donante) {
            return;
          }

          const amount = Number.isFinite(donation.cantidad) ? donation.cantidad : 0;
          const donationDate = donation.created_at ? new Date(donation.created_at) : null;
          const monthKey = donationDate
            ? `${donationDate.getFullYear()}-${String(donationDate.getMonth() + 1).padStart(2, '0')}`
            : '';

          const currentAggregate = aggregateMap.get(donation.id_donante) || {
            donorId: donation.id_donante,
            donorName: donation.donor_name,
            totalAmount: 0,
            sixMonthAmount: 0,
            monthlyAmounts: activeMonthKeys.reduce<Record<string, number>>((accumulator, key) => {
              accumulator[key] = 0;
              return accumulator;
            }, {}),
          };

          currentAggregate.totalAmount += amount;

          if (donationDate && donationDate >= sixMonthsAgo) {
            currentAggregate.sixMonthAmount += amount;
          }

          if (monthKey && activeMonthKeys.includes(monthKey)) {
            currentAggregate.monthlyAmounts[monthKey] += amount;
          }

          aggregateMap.set(donation.id_donante, currentAggregate);
        });

        if (isMounted) {
          setOrganizationDonations(parsedDonations);
          const detailsRecord = Array.from(donorById.values()).reduce<Record<string, DonorDetail>>((accumulator, donor) => {
            accumulator[donor.id_donante] = donor;
            return accumulator;
          }, {});
          setDonorDetailsById(detailsRecord);
          setDonorAggregates(
            Array.from(aggregateMap.values()).sort((first, second) => second.sixMonthAmount - first.sixMonthAmount),
          );
          setSelectedDonorId((current) => (current && detailsRecord[current] ? current : ''));
        }
      } catch {
        if (isMounted) {
          setOrganizationDonations([]);
          setDonorAggregates([]);
          setDonorDetailsById({});
          setSelectedDonorId('');
          setDonationDataError('No fue posible cargar el historial de donaciones.');
        }
      } finally {
        if (isMounted) {
          setLoadingDonationData(false);
        }
      }
    };

    void loadOrganizationDonationData();

    return () => {
      isMounted = false;
    };
  }, []);

  const donationLink = origin && organizationId ? `${origin}/donacion/${organizationId}` : '';

  const formatCurrency = (amount: number) =>
    amount.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('es-MX', {
      month: 'short',
      year: '2-digit',
    });
  };

  const getAlertStatus = (amount: number): 'none' | 'yellow' | 'red' => {
    if (amount >= AML_THRESHOLD_2) {
      return 'red';
    }

    if (amount >= AML_THRESHOLD_1) {
      return 'yellow';
    }

    return 'none';
  };

  const filteredOrganizationDonations = useMemo(() => {
    const normalizedSearch = historySearchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return organizationDonations;
    }

    return organizationDonations.filter((donation) => {
      const searchableFields = [
        donation.donor_name,
        donation.folio || '',
        donation.Tipo || '',
        formatDate(donation.created_at),
        formatCurrency(donation.cantidad),
      ]
        .join(' ')
        .toLowerCase();

      return searchableFields.includes(normalizedSearch);
    });
  }, [organizationDonations, historySearchTerm]);

  const totalHistoryPages = Math.max(
    1,
    Math.ceil(filteredOrganizationDonations.length / DONATION_HISTORY_PAGE_SIZE),
  );

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearchTerm]);

  useEffect(() => {
    if (historyPage > totalHistoryPages) {
      setHistoryPage(totalHistoryPages);
    }
  }, [historyPage, totalHistoryPages]);

  const paginatedOrganizationDonations = useMemo(() => {
    const startIndex = (historyPage - 1) * DONATION_HISTORY_PAGE_SIZE;
    return filteredOrganizationDonations.slice(startIndex, startIndex + DONATION_HISTORY_PAGE_SIZE);
  }, [filteredOrganizationDonations, historyPage]);

  const filteredDonorAggregates = useMemo(() => {
    const normalizedSearch = donorSearchTerm.trim().toLowerCase();

    return donorAggregates.filter((donor) => {
      const searchMatch =
        !normalizedSearch ||
        donor.donorName.toLowerCase().includes(normalizedSearch);

      if (!searchMatch) {
        return false;
      }

      if (donorAlertFilter === 'all') {
        return true;
      }

      if (donorAlertFilter === 'threshold2') {
        return donor.sixMonthAmount >= AML_THRESHOLD_2;
      }

      if (donorAlertFilter === 'threshold1') {
        return donor.sixMonthAmount >= AML_THRESHOLD_1 && donor.sixMonthAmount < AML_THRESHOLD_2;
      }

      return donor.sixMonthAmount < AML_THRESHOLD_1;
    });
  }, [donorAggregates, donorSearchTerm, donorAlertFilter]);

  useEffect(() => {
    setDonorPage(1);
  }, [donorSearchTerm, donorAlertFilter]);

  const totalDonorPages = Math.max(1, Math.ceil(filteredDonorAggregates.length / DONOR_PAGE_SIZE));

  useEffect(() => {
    if (donorPage > totalDonorPages) {
      setDonorPage(totalDonorPages);
    }
  }, [donorPage, totalDonorPages]);

  const paginatedDonorAggregates = useMemo(() => {
    const startIndex = (donorPage - 1) * DONOR_PAGE_SIZE;
    return filteredDonorAggregates.slice(startIndex, startIndex + DONOR_PAGE_SIZE);
  }, [filteredDonorAggregates, donorPage]);

  const selectedDonorDetail = selectedDonorId ? donorDetailsById[selectedDonorId] : undefined;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(donationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-2">
      {/* Header */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
            <div className="xl:pr-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Perfil de Donaciones</h1>
              <p className="text-sm sm:text-base text-gray-600">Configure su información bancaria y monitoree donaciones recibidas</p>
            </div>

            {!checkingBankAccount && hasBankAccountConfigured && (
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
                          onClick={copyToClipboard}
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

      {!checkingBankAccount && !hasBankAccountConfigured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <p className="text-sm font-medium text-amber-800 leading-relaxed">
            La informacion bancaria de tu cuenta no esta registrada favor de ir a perfil a configurarla
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setViewMode('history')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              viewMode === 'history'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Ver Historial
          </button>
          <button
            type="button"
            onClick={() => setViewMode('donors')}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              viewMode === 'donors'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            Ver Donadores
          </button>
        </div>
      </div>

      {viewMode === 'history' && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Historial de Donaciones</h2>
            <p className="text-sm text-gray-500">{organizationName || 'Organización actual'}</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={historySearchTerm}
              onChange={(event) => setHistorySearchTerm(event.target.value)}
              placeholder="Buscar por donador, RFC, folio, tipo..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        {loadingDonationData ? (
          <p className="text-sm text-gray-600">Cargando historial de donaciones...</p>
        ) : donationDataError ? (
          <p className="text-sm text-red-600">{donationDataError}</p>
        ) : filteredOrganizationDonations.length === 0 ? (
          <p className="text-sm text-gray-600">No hay donaciones registradas para esta organización.</p>
        ) : (
          <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-600">
                  <th className="py-3 pl-4 pr-4 font-medium">Fecha</th>
                  <th className="py-3 pr-4 font-medium">Donador</th>
                  <th className="py-3 pr-4 font-medium">Folio</th>
                  <th className="py-3 pr-4 font-medium">Tipo</th>
                  <th className="py-3 pl-2 pr-4 font-medium text-right">Monto</th>
                </tr>
              </thead>
              <tbody>
                {paginatedOrganizationDonations.map((donation) => (
                  <tr key={donation.id_donacion} className="border-b border-gray-100 last:border-0 odd:bg-white even:bg-gray-50/30 hover:bg-emerald-50/40 transition-colors">
                    <td className="py-3 pl-4 pr-4 text-gray-800">{formatDate(donation.created_at)}</td>
                    <td className="py-3 pr-4 text-gray-800">{donation.donor_name}</td>
                    <td className="py-3 pr-4 text-gray-700">{donation.folio || 'Sin folio'}</td>
                    <td className="py-3 pr-4 text-gray-700">{donation.Tipo || 'N/A'}</td>
                    <td className="py-3 pl-2 pr-4 text-right text-gray-900 font-semibold">{formatCurrency(donation.cantidad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-600">
              Mostrando {paginatedOrganizationDonations.length} de {filteredOrganizationDonations.length} donaciones
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                disabled={historyPage === 1}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <span className="text-sm text-gray-700 min-w-24 text-center">
                Página {historyPage} de {totalHistoryPages}
              </span>
              <button
                type="button"
                onClick={() => setHistoryPage((prev) => Math.min(totalHistoryPages, prev + 1))}
                disabled={historyPage === totalHistoryPages}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          </>
        )}
      </div>
      )}

      {viewMode === 'donors' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Donadores y Acumulados</h2>
            <div className="text-xs text-gray-500">
              Umbral 1: {formatCurrency(AML_THRESHOLD_1)} | Umbral 2: {formatCurrency(AML_THRESHOLD_2)}
            </div>
          </div>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2 sm:items-center">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={donorSearchTerm}
                onChange={(event) => setDonorSearchTerm(event.target.value)}
                placeholder="Buscar donador por nombre..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <select
              value={donorAlertFilter}
              onChange={(event) => setDonorAlertFilter(event.target.value as DonorAlertFilter)}
              className="w-full sm:w-44 px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">Todos</option>
              <option value="threshold1">Umbral 1</option>
              <option value="threshold2">Umbral 2</option>
              <option value="none">Sin umbral</option>
            </select>
          </div>
        </div>

        {loadingDonationData ? (
          <p className="text-sm text-gray-600">Calculando acumulados por donador...</p>
        ) : filteredDonorAggregates.length === 0 ? (
          <p className="text-sm text-gray-600">Aún no hay donadores con aportaciones registradas.</p>
        ) : (
          <>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-600">
                  <th className="py-3 pl-4 pr-4 font-medium">Donador</th>
                  <th className="py-3 pr-4 font-medium text-right">Total histórico</th>
                  <th className="py-3 pr-4 font-medium text-right">Acumulado 6 meses</th>
                  {monthKeys.map((monthKey) => (
                    <th key={monthKey} className="py-3 pr-4 font-medium text-right">{formatMonth(monthKey)}</th>
                  ))}
                  <th className="py-3 pr-4 font-medium">Advertencia</th>
                </tr>
              </thead>
              <tbody>
                {paginatedDonorAggregates.map((donor) => {
                  const alertStatus = getAlertStatus(donor.sixMonthAmount);
                  const canShowDetail = alertStatus === 'yellow' || alertStatus === 'red';

                  return (
                    <tr key={donor.donorId} className="border-b border-gray-100 last:border-0 odd:bg-white even:bg-gray-50/30 hover:bg-emerald-50/40 transition-colors">
                      <td className={`py-3 pl-4 pr-4 text-gray-800 ${canShowDetail ? 'cursor-pointer' : 'cursor-default'}`}>
                        {canShowDetail ? (
                          <button
                            type="button"
                            onClick={() => setSelectedDonorId(donor.donorId)}
                            className="text-emerald-700 hover:text-emerald-800 hover:underline font-medium cursor-pointer"
                          >
                            {donor.donorName}
                          </button>
                        ) : (
                          donor.donorName
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right text-gray-900 font-semibold">{formatCurrency(donor.totalAmount)}</td>
                      <td className={`py-3 pr-4 text-right font-semibold ${
                        alertStatus === 'red' ? 'text-red-700' : alertStatus === 'yellow' ? 'text-yellow-700' : 'text-gray-900'
                      }`}>
                        {formatCurrency(donor.sixMonthAmount)}
                      </td>
                      {monthKeys.map((monthKey) => (
                        <td key={`${donor.donorId}-${monthKey}`} className="py-3 pr-4 text-right text-gray-700">
                          {formatCurrency(donor.monthlyAmounts[monthKey] || 0)}
                        </td>
                      ))}
                      <td className="py-3 pr-4">
                        {alertStatus === 'red' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Umbral 2
                          </span>
                        ) : alertStatus === 'yellow' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Umbral 1
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-700 font-medium">Sin alerta</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm text-gray-600">
              Mostrando {paginatedDonorAggregates.length} de {filteredDonorAggregates.length} donadores
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDonorPage((prev) => Math.max(1, prev - 1))}
                disabled={donorPage === 1}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Anterior
              </button>
              <span className="text-sm text-gray-700 min-w-24 text-center">
                Página {donorPage} de {totalDonorPages}
              </span>
              <button
                type="button"
                onClick={() => setDonorPage((prev) => Math.min(totalDonorPages, prev + 1))}
                disabled={donorPage === totalDonorPages}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
              >
                Siguiente
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          </>
        )}
        </div>
      )}

      {selectedDonorDetail && (
        <div
          className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setSelectedDonorId('')}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-gray-200 max-h-[88vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-base font-semibold text-gray-900">Detalle de donador alertado</h3>
              <button
                type="button"
                onClick={() => setSelectedDonorId('')}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-800">
                <p><span className="font-medium">Nombre:</span> {selectedDonorDetail.nombreCompleto}</p>
                <p><span className="font-medium">RFC:</span> {selectedDonorDetail.rfc}</p>
                <p><span className="font-medium">Correo:</span> {selectedDonorDetail.email}</p>
                <p><span className="font-medium">Teléfono:</span> {selectedDonorDetail.telefono}</p>
                <p><span className="font-medium">Fecha nacimiento:</span> {selectedDonorDetail.fechaNacimiento}</p>
              </div>

              <div className="pt-4 border-t border-gray-200 text-sm text-gray-800">
                <p className="font-medium text-gray-900 mb-1">Dirección</p>
                <p>
                  {selectedDonorDetail.direccion.calle} #{selectedDonorDetail.direccion.numExterior}
                  {selectedDonorDetail.direccion.numInterior !== 'N/A' ? ` Int. ${selectedDonorDetail.direccion.numInterior}` : ''}
                </p>
                <p>
                  CP {selectedDonorDetail.direccion.cp}, {selectedDonorDetail.direccion.ciudadAlcaldia}, {selectedDonorDetail.direccion.entidadFederativa}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
