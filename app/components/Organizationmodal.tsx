// components/OrganizationModal.tsx
// Este componente es un modal para mostrar los detalles de una organización en revisión,
// incluye información de contacto, nivel de riesgo, fecha de registro y un visor de documentos,
// también muestra el estado de verificación con un badge de color y permite cerrar el modal haciendo clic fuera o presionando Escape.

'use client'

import { useEffect, useState } from 'react';
import { X, Building2, Phone, Mail, MapPin, Shield, Calendar, Tag, AlertTriangle, CheckCircle, Clock, FileText, Bell, ShieldAlert, HandCoins, Loader2, Users } from 'lucide-react';
import { DocumentViewer } from './Documentviewer';
import {WorkerModel} from '@/lib/models/worker.model';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

interface OrganizationDetail {
  id: string;
  name: string;
  type: string;
  contact: string;
  email: string;
  location: string;
  status: 'Verificada' | 'En revisión' | 'Pendiente';
  risk: 'Bajo' | 'Medio' | 'Alto';
  registrationDate: string;
}

interface DashboardDocument {
  id: string;
  nombre_documento: string | null;
  vencimiento: string | null;
  estado: string | null;
}

interface DashboardAnnouncement {
  estado: string | null;
}

interface DashboardAlert {
  umbral: number;
  created_at: string | null;
}

interface DashboardDonation {
  id_donante: string | null;
  created_at: string;
  cantidad: number | null;
}

interface DashboardDonor {
  id_donante: string;
  nombre: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
}

interface AlertedDonor {
  donorId: string;
  donorName: string;
  totalAmount: number;
  sixMonthAmount: number;
  threshold: 'Umbral 1' | 'Umbral 2';
}

interface OrganizationInsights {
  pendingCount: number;
  approvedCount: number;
  inReviewCount: number;
  overdueCount: number;
  unreadAnnouncementsCount: number;
  amlAlertsCount: number;
  latestAmlThreshold: number | null;
  donationsCount: number;
  totalDonationsAmount: number;
  currentMonthAmount: number;
  compliancePercentage: number;
  nextDeadlineDocument: string | null;
  nextDeadlineDate: string | null;
  nextDeadlineDaysLeft: number | null;
  alertedDonors: AlertedDonor[];
}

interface OrganizationModalProps {
  organization: OrganizationDetail | null;
  worker: WorkerModel | null;
  onClose: () => void;
}

const AML_THRESHOLD_1 = 181589.70;
const AML_THRESHOLD_2 = 363179.40;
const AML_MONTH_WINDOW = 6;

const EMPTY_INSIGHTS: OrganizationInsights = {
  pendingCount: 0,
  approvedCount: 0,
  inReviewCount: 0,
  overdueCount: 0,
  unreadAnnouncementsCount: 0,
  amlAlertsCount: 0,
  latestAmlThreshold: null,
  donationsCount: 0,
  totalDonationsAmount: 0,
  currentMonthAmount: 0,
  compliancePercentage: 0,
  nextDeadlineDocument: null,
  nextDeadlineDate: null,
  nextDeadlineDaysLeft: null,
  alertedDonors: [],
};

const normalizeRiskLevel = (riskValue: string): 'Bajo' | 'Medio' | 'Alto' => {
  const normalized = riskValue.trim().toLowerCase();
  if (normalized === 'alto') return 'Alto';
  if (normalized === 'medio') return 'Medio';
  return 'Bajo';
};

const normalizeDocumentStatus = (status: string | null): 'approved' | 'pending' | 'overdue' | 'in_review' | 'rejected' => {
  const normalized = (status ?? '').trim().toLowerCase();

  if (normalized === 'aprobado' || normalized === 'approved') return 'approved';
  if (normalized === 'en revision' || normalized === 'en revisión' || normalized === 'in_review') return 'in_review';
  if (normalized === 'rechazado' || normalized === 'rejected') return 'rejected';
  if (normalized === 'vencido' || normalized === 'overdue' || normalized === 'atrasado' || normalized === 'late') return 'overdue';

  return 'pending';
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getDaysUntilDate = (date: string) => {
  const today = new Date();
  const targetDate = new Date(date);

  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const buildDonorName = (donor: DashboardDonor) => {
  return [donor.nombre, donor.apellido_paterno, donor.apellido_materno]
    .filter(Boolean)
    .join(' ')
    .trim() || 'Donador sin nombre';
};

export function OrganizationModal({ organization, worker, onClose }: OrganizationModalProps) {
  const [insights, setInsights] = useState<OrganizationInsights>(EMPTY_INSIGHTS);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'documents'>('summary');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    if (organization) {
      setActiveTab('summary');
    }
  }, [organization]);

  useEffect(() => {
    if (!organization) {
      setInsights(EMPTY_INSIGHTS);
      setLoadingInsights(false);
      setLoadingError(null);
      return;
    }

    let isMounted = true;

    const loadOrganizationInsights = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setInsights(EMPTY_INSIGHTS);
          setLoadingInsights(false);
          setLoadingError('Supabase no está configurado para consultar el resumen de la organización.');
        }
        return;
      }

      setLoadingInsights(true);
      setLoadingError(null);

      try {
        const supabase = getSupabaseClient();

        const [documentsResponse, announcementsResponse, amlAlertsResponse, donationsResponse] = await Promise.all([
          supabase
            .from('documentos')
            .select('id, nombre_documento, vencimiento, estado')
            .eq('id_osc', organization.id),
          supabase
            .from('avisos')
            .select('estado')
            .eq('id_osc', organization.id)
            .order('fecha', { ascending: false })
            .limit(100),
          supabase
            .from('alertas_aml')
            .select('umbral, created_at')
            .eq('id_osc', organization.id)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('donaciones')
            .select('id_donante, created_at, cantidad')
            .eq('id_osc', organization.id)
            .order('created_at', { ascending: false }),
        ]);

        if (documentsResponse.error) throw documentsResponse.error;
        if (announcementsResponse.error) throw announcementsResponse.error;
        if (amlAlertsResponse.error) throw amlAlertsResponse.error;
        if (donationsResponse.error) throw donationsResponse.error;

        const documents = (documentsResponse.data ?? []) as DashboardDocument[];
        const announcements = (announcementsResponse.data ?? []) as DashboardAnnouncement[];
        const amlAlerts = (amlAlertsResponse.data ?? []) as DashboardAlert[];
        const donations = (donationsResponse.data ?? []) as DashboardDonation[];

        const donorIds = Array.from(new Set(
          donations
            .map((donation) => donation.id_donante)
            .filter((id): id is string => Boolean(id)),
        ));

        let donorsById = new Map<string, string>();

        if (donorIds.length > 0) {
          const donorsResponse = await supabase
            .from('donantes')
            .select('id_donante, nombre, apellido_paterno, apellido_materno')
            .in('id_donante', donorIds);

          if (donorsResponse.error) throw donorsResponse.error;

          donorsById = new Map(
            ((donorsResponse.data ?? []) as DashboardDonor[]).map((donor) => [donor.id_donante, buildDonorName(donor)]),
          );
        }

        const counts = {
          pendingCount: 0,
          approvedCount: 0,
          inReviewCount: 0,
          overdueCount: 0,
        };

        documents.forEach((document) => {
          const status = normalizeDocumentStatus(document.estado);
          if (status === 'approved') counts.approvedCount += 1;
          if (status === 'in_review') counts.inReviewCount += 1;
          if (status === 'pending') counts.pendingCount += 1;
          if (status === 'overdue') {
            counts.overdueCount += 1;
            counts.pendingCount += 1;
          }
        });

        const unreadAnnouncementsCount = announcements
          .filter((announcement) => (announcement.estado ?? '').trim().toLowerCase() !== 'leido').length;

        const totalDonationsAmount = donations.reduce((accumulator, donation) => {
          return accumulator + Number(donation.cantidad ?? 0);
        }, 0);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const currentMonthAmount = donations.reduce((accumulator, donation) => {
          const donationDate = new Date(donation.created_at);
          if (donationDate.getMonth() === currentMonth && donationDate.getFullYear() === currentYear) {
            return accumulator + Number(donation.cantidad ?? 0);
          }
          return accumulator;
        }, 0);

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - (AML_MONTH_WINDOW - 1));
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const donorAggregates = new Map<string, AlertedDonor>();

        donations.forEach((donation) => {
          if (!donation.id_donante) {
            return;
          }

          const donorId = donation.id_donante;
          const amount = Number(donation.cantidad ?? 0);
          const donationDate = new Date(donation.created_at);
          const currentAggregate = donorAggregates.get(donorId) ?? {
            donorId,
            donorName: donorsById.get(donorId) ?? 'Donador no identificado',
            totalAmount: 0,
            sixMonthAmount: 0,
            threshold: 'Umbral 1' as const,
          };

          currentAggregate.totalAmount += amount;

          if (donationDate >= sixMonthsAgo) {
            currentAggregate.sixMonthAmount += amount;
          }

          donorAggregates.set(donorId, currentAggregate);
        });

        const alertedDonors = Array.from(donorAggregates.values())
          .filter((donor) => donor.sixMonthAmount >= AML_THRESHOLD_1)
          .map<AlertedDonor>((donor) => ({
            ...donor,
            threshold: donor.sixMonthAmount >= AML_THRESHOLD_2 ? 'Umbral 2' : 'Umbral 1',
          }))
          .sort((first, second) => second.sixMonthAmount - first.sixMonthAmount)
          .slice(0, 8);

        const nextDeadline = documents
          .filter((document) => Boolean(document.vencimiento))
          .map((document) => {
            const dueDate = document.vencimiento as string;
            return {
              documentName: document.nombre_documento?.trim() || 'Documento sin nombre',
              dueDate,
              status: normalizeDocumentStatus(document.estado),
              daysLeft: getDaysUntilDate(dueDate),
            };
          })
          .filter((document) => document.status === 'pending' || document.status === 'overdue')
          .sort((first, second) => new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime())[0] ?? null;

        const totalDocuments = documents.length;
        const compliancePercentage = totalDocuments > 0
          ? Math.round((counts.approvedCount / totalDocuments) * 100)
          : 0;

        if (!isMounted) return;

        setInsights({
          ...counts,
          unreadAnnouncementsCount,
          amlAlertsCount: amlAlerts.length,
          latestAmlThreshold: amlAlerts[0]?.umbral ?? null,
          donationsCount: donations.length,
          totalDonationsAmount,
          currentMonthAmount,
          compliancePercentage,
          nextDeadlineDocument: nextDeadline?.documentName ?? null,
          nextDeadlineDate: nextDeadline?.dueDate ?? null,
          nextDeadlineDaysLeft: nextDeadline?.daysLeft ?? null,
          alertedDonors,
        });
      } catch (error) {
        if (!isMounted) return;
        setInsights(EMPTY_INSIGHTS);
        setLoadingError(error instanceof Error ? error.message : 'No fue posible cargar el resumen de la organización.');
      } finally {
        if (isMounted) {
          setLoadingInsights(false);
        }
      }
    };

    void loadOrganizationInsights();

    return () => {
      isMounted = false;
    };
  }, [organization]);

  if (!organization) return null;

  const statusConfig = {
    'Verificada':  { icon: <CheckCircle className="w-4 h-4" />, classes: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    'En revisión': { icon: <Clock className="w-4 h-4" />,        classes: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    'Pendiente':   { icon: <AlertTriangle className="w-4 h-4" />, classes: 'bg-gray-100 text-gray-600 border-gray-200' },
  };
  const riskConfig = {
    'Bajo':  { classes: 'bg-green-100 text-green-700',   bar: 'w-1/3 bg-green-500' },
    'Medio': { classes: 'bg-orange-100 text-orange-700', bar: 'w-2/3 bg-orange-500' },
    'Alto':  { classes: 'bg-red-100 text-red-700',       bar: 'w-full bg-red-500' },
  };

  const status = statusConfig[organization.status] ?? statusConfig['Pendiente'];
  const normalizedRisk = normalizeRiskLevel(organization.risk);
  const risk   = riskConfig[normalizedRisk] ?? riskConfig['Bajo'];
  const documentsBadge = insights.pendingCount + insights.inReviewCount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-white/60">
        {/* Header - Full width */}
        <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-500 px-6 pt-6 pb-8 flex-shrink-0">
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition z-10">
            <X className="w-4 h-4" />
          </button>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 bg-white/15 ring-1 ring-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-900/20">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white leading-tight break-words">{organization.name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Tag className="w-3.5 h-3.5 text-emerald-200" />
                <span className="text-sm text-emerald-100">{organization.type || 'Sin tipo'}</span>
                <span className="hidden sm:inline text-emerald-200">•</span>
                <span className="text-sm text-emerald-100">Alta: {new Date(organization.registrationDate).toLocaleDateString('es-MX', {
                  day: '2-digit', month: '2-digit', year: 'numeric'
                })}</span>
              </div>
            </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <HeaderMiniStat label="Riesgo" value={normalizedRisk} />
              <HeaderMiniStat label="Pendientes" value={String(insights.pendingCount)} />
              <HeaderMiniStat label="AML" value={String(insights.amlAlertsCount)} />
              <HeaderMiniStat label="Donadores" value={String(insights.alertedDonors.length)} />
            </div>
          </div>
        </div>

        {/* Status and tabs */}
        <div className="relative px-6 -mt-4 mb-0 flex-shrink-0">
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${status.classes}`}>
                  {status.icon}{organization.status}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${risk.classes}`}>
                  <Shield className="w-3.5 h-3.5" />{normalizedRisk}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                  <FileText className="w-3.5 h-3.5" />{documentsBadge} docs por atender
                </span>
              </div>

              <div className="inline-flex rounded-2xl bg-gray-100 p-1.5 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab('summary')}
                  className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    activeTab === 'summary'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  Dashboard Organización
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`flex-1 lg:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    activeTab === 'documents'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Documentos
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-5 min-h-0 bg-gradient-to-b from-gray-50/60 to-white">
          {activeTab === 'summary' ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.35fr] gap-5">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <SectionHeader
                    title="Perfil de la organización"
                    description="Datos clave para identificar y contextualizar a la organización seleccionada."
                  />

                  <div className="space-y-2">
                    <InfoRow icon={<MapPin className="w-4 h-4 text-emerald-500" />} label="Dirección" value={organization.location} />
                    <InfoRow icon={<Phone className="w-4 h-4 text-emerald-500" />} label="Teléfono" value={organization.contact} />
                    <InfoRow icon={<Mail className="w-4 h-4 text-emerald-500" />} label="Correo" value={organization.email} />
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nivel de riesgo</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{normalizedRisk}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${risk.classes}`}>
                        <Shield className="w-3.5 h-3.5" /> {normalizedRisk}
                      </span>
                    </div>
                    <div className="mt-3 h-2 w-full bg-white rounded-full overflow-hidden border border-gray-200">
                      <div className={`h-full rounded-full ${risk.bar}`} />
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-emerald-50 to-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha de registro</p>
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      {new Date(organization.registrationDate).toLocaleDateString('es-MX', {
                        day: '2-digit', month: 'long', year: 'numeric'
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  {loadingInsights ? (
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 flex items-center gap-3 shadow-sm">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                      Cargando métricas clave de la organización...
                    </div>
                  ) : loadingError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
                      {loadingError}
                    </div>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                        <SectionHeader
                          title="Resumen operativo"
                          description="Vista rápida del estado documental, avisos y alertas AML de la organización."
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <MetricCard icon={<Clock className="w-4 h-4 text-orange-600" />} label="Pendientes" value={String(insights.pendingCount)} description={insights.overdueCount > 0 ? `${insights.overdueCount} vencidos` : 'Sin atraso crítico'} tone="orange" />
                          <MetricCard icon={<CheckCircle className="w-4 h-4 text-emerald-600" />} label="Aprobados" value={String(insights.approvedCount)} description={`${insights.compliancePercentage}% de cumplimiento`} tone="emerald" />
                          <MetricCard icon={<Bell className="w-4 h-4 text-blue-600" />} label="Avisos" value={String(insights.unreadAnnouncementsCount)} description="Pendientes de lectura" tone="blue" />
                          <MetricCard icon={<ShieldAlert className="w-4 h-4 text-rose-600" />} label="Alertas AML" value={String(insights.amlAlertsCount)} description={insights.latestAmlThreshold ? `Último umbral ${insights.latestAmlThreshold}` : 'Sin alertas'} tone="rose" />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                        <SectionHeader
                          title="Resumen financiero"
                          description="Montos principales y próximo vencimiento relevante para seguimiento inmediato."
                        />
                        <div className="grid grid-cols-1 gap-3">
                          <InfoPanel icon={<HandCoins className="w-4 h-4 text-emerald-600" />} title="Donaciones históricas" value={formatCurrency(insights.totalDonationsAmount)} subtitle={`${insights.donationsCount} registro(s) en total`} />
                          <InfoPanel icon={<Calendar className="w-4 h-4 text-teal-600" />} title="Donado este mes" value={formatCurrency(insights.currentMonthAmount)} subtitle="Acumulado del mes actual" />
                          <InfoPanel icon={<FileText className="w-4 h-4 text-amber-600" />} title="Próximo vencimiento" value={insights.nextDeadlineDocument ?? 'Sin vencimientos pendientes'} subtitle={insights.nextDeadlineDate ? `${new Date(insights.nextDeadlineDate).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}${insights.nextDeadlineDaysLeft !== null ? ` · ${insights.nextDeadlineDaysLeft >= 0 ? `${insights.nextDeadlineDaysLeft} día(s)` : `${Math.abs(insights.nextDeadlineDaysLeft)} día(s) vencido`}` : ''}` : 'No hay fechas por atender'} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!loadingInsights && !loadingError && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
                  <SectionHeader
                    title="Donadores con alerta AML"
                    description="Donadores que superaron el umbral 1 o 2 en los últimos 6 meses."
                    aside={
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                        <Users className="w-3 h-3" /> {insights.alertedDonors.length}
                      </span>
                    }
                  />

                  {insights.alertedDonors.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {insights.alertedDonors.map((donor) => (
                        <div key={donor.donorId} className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900 break-words">{donor.donorName}</p>
                              <p className="mt-1 text-xs text-gray-500">Histórico: {formatCurrency(donor.totalAmount)}</p>
                            </div>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                              donor.threshold === 'Umbral 2'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              <AlertTriangle className="w-3 h-3" />
                              {donor.threshold}
                            </span>
                          </div>
                          <div className="mt-4 rounded-xl bg-white border border-gray-200 px-3 py-3">
                            <p className="text-[11px] uppercase tracking-wide text-gray-500">Acumulado últimos 6 meses</p>
                            <p className={`mt-1 text-lg font-bold ${donor.threshold === 'Umbral 2' ? 'text-red-700' : 'text-yellow-700'}`}>
                              {formatCurrency(donor.sixMonthAmount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
                      No hay donadores que hayan superado los umbrales AML 1 o 2 en los últimos 6 meses.
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <SectionHeader
                  title="Documentos en revisión"
                  description="Consulta, valida y actualiza los documentos enviados por la organización desde un solo lugar."
                />
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <DocumentViewer orgId={organization.id} worker={worker} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 flex justify-end bg-gray-50">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm text-gray-800 font-medium break-words">{value || '—'}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  aside,
}: {
  title: string;
  description: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      </div>
      {aside ? <div className="flex-shrink-0">{aside}</div> : null}
    </div>
  );
}

function HeaderMiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/12 ring-1 ring-white/15 px-3 py-2.5 text-white shadow-sm backdrop-blur-sm min-w-[84px]">
      <p className="text-[11px] uppercase tracking-wide text-emerald-100">{label}</p>
      <p className="mt-1 text-lg font-bold leading-none">{value}</p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  tone: 'orange' | 'emerald' | 'blue' | 'rose';
}) {
  const tones = {
    orange: 'bg-orange-50 border-orange-200',
    emerald: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
    rose: 'bg-rose-50 border-rose-200',
  };

  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-600">{description}</p>
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
          <p className="mt-1 text-sm font-semibold text-gray-900 break-words">{value}</p>
          <p className="mt-1 text-xs text-gray-600">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}