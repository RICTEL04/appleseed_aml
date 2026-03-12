// components/OrganizationDashboard.tsx
// Este componente es el dashboard principal para las organizaciones, muestra métricas 
// clave como estado de verificación, riesgo, vencimientos próximos, cobertura de documentos 
// y alertas AML, además de gráficos de tendencias, distribución de riesgos, estado de documentos 
// y alertas por umbral, también incluye una sección de acciones inmediatas para dar seguimiento a 
// los casos más urgentes y una tabla con los documentos próximos a vencer.
"use client";

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, AlertTriangle, FileText, Bell, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';
import mexicoMap from '@svg-maps/mexico';

type DocumentStatus = 'approved' | 'pending' | 'overdue' | 'in_review' | 'rejected';

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
  id: string;
  umbral: number;
  created_at: string | null;
}

interface DashboardDonation {
  id_donacion: string;
  id_donante: string | null;
  created_at: string;
  cantidad: number | null;
}

interface DashboardDonor {
  id_donante: string;
  id_direccion: string | null;
}

interface DashboardDirection {
  id_direccion: string;
  entidad_federativa: string | null;
}

interface MexicoMapLocation {
  id: string;
  name: string;
  path: string;
}

interface MexicoMapData {
  viewBox: string;
  locations: MexicoMapLocation[];
}

interface OscProfile {
  nombre_organizacion: string | null;
  estado_verificacion: string | null;
  riesgo: string | null;
}

const normalizeStatus = (status: string | null): DocumentStatus => {
  const normalized = (status ?? '').trim().toLowerCase();

  if (normalized === 'aprobado' || normalized === 'approved') return 'approved';
  if (normalized === 'en revision' || normalized === 'en revisión' || normalized === 'in_review') return 'in_review';
  if (normalized === 'rechazado' || normalized === 'rejected') return 'rejected';
  if (normalized === 'vencido' || normalized === 'overdue' || normalized === 'atrasado' || normalized === 'late') return 'overdue';

  return 'pending';
};

const getDaysUntilDate = (date: string) => {
  const today = new Date();
  const targetDate = new Date(date);

  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const getHoursUntilDate = (date: string) => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffTime = targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60));
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const STATE_ALIASES: Record<string, string> = {
  'aguascalientes': 'Aguascalientes',
  'baja california': 'Baja California',
  'baja california sur': 'Baja California Sur',
  'campeche': 'Campeche',
  'coahuila': 'Coahuila',
  'coahuila de zaragoza': 'Coahuila',
  'colima': 'Colima',
  'chiapas': 'Chiapas',
  'chihuahua': 'Chihuahua',
  'ciudad de mexico': 'Ciudad de Mexico',
  'distrito federal': 'Ciudad de Mexico',
  'cdmx': 'Ciudad de Mexico',
  'mexico city': 'Ciudad de Mexico',
  'durango': 'Durango',
  'estado de mexico': 'Estado de Mexico',
  'edo de mexico': 'Estado de Mexico',
  'mexico': 'Estado de Mexico',
  'guanajuato': 'Guanajuato',
  'guerrero': 'Guerrero',
  'hidalgo': 'Hidalgo',
  'jalisco': 'Jalisco',
  'michoacan': 'Michoacan',
  'michoacan de ocampo': 'Michoacan',
  'morelos': 'Morelos',
  'nayarit': 'Nayarit',
  'nuevo leon': 'Nuevo Leon',
  'oaxaca': 'Oaxaca',
  'puebla': 'Puebla',
  'queretaro': 'Queretaro',
  'quintana roo': 'Quintana Roo',
  'san luis potosi': 'San Luis Potosi',
  'sinaloa': 'Sinaloa',
  'sonora': 'Sonora',
  'tabasco': 'Tabasco',
  'tamaulipas': 'Tamaulipas',
  'tlaxcala': 'Tlaxcala',
  'veracruz': 'Veracruz',
  'veracruz de ignacio de la llave': 'Veracruz',
  'yucatan': 'Yucatan',
  'zacatecas': 'Zacatecas',
};

const normalizeStateName = (stateName: string | null | undefined) => {
  const normalized = (stateName ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return STATE_ALIASES[normalized] ?? '';
};

const getStateFillColor = (count: number, maxCount: number) => {
  if (count === 0 || maxCount === 0) return '#ecfeff';
  const intensity = count / maxCount;
  if (intensity >= 0.75) return '#0f766e';
  if (intensity >= 0.5) return '#14b8a6';
  if (intensity >= 0.25) return '#5eead4';
  return '#99f6e4';
};

const typedMexicoMap = mexicoMap as unknown as MexicoMapData;

export function OrganizationDashboard() {
  const [organizationId, setOrganizationId] = useState<string>('');
  const [organizationName, setOrganizationName] = useState('Organización');
  const [organizationProfile, setOrganizationProfile] = useState<OscProfile | null>(null);
  const [documents, setDocuments] = useState<DashboardDocument[]>([]);
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);
  const [amlAlerts, setAmlAlerts] = useState<DashboardAlert[]>([]);
  const [donations, setDonations] = useState<DashboardDonation[]>([]);
  const [donors, setDonors] = useState<DashboardDonor[]>([]);
  const [directions, setDirections] = useState<DashboardDirection[]>([]);
  const [hoveredState, setHoveredState] = useState<{ name: string; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    const storedOrganizationId = localStorage.getItem('organization_id') || '';
    const storedOrganizationName = localStorage.getItem('organization_name') || 'Organización';

    setOrganizationId(storedOrganizationId);
    setOrganizationName(storedOrganizationName);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      if (!organizationId) {
        if (isMounted) {
          setLoading(false);
          setLoadingError('No se encontró la organización activa.');
        }
        return;
      }

      if (!isSupabaseConfigured) {
        if (isMounted) {
          setLoading(false);
          setLoadingError('Supabase no está configurado para consultar el dashboard.');
        }
        return;
      }

      setLoading(true);
      setLoadingError(null);

      try {
        const supabase = getSupabaseClient();

        const [oscResponse, documentsResponse, announcementsResponse, amlAlertsResponse, donationsResponse] = await Promise.all([
          supabase
            .from('osc')
            .select('nombre_organizacion, estado_verificacion, riesgo')
            .eq('id_osc', organizationId)
            .maybeSingle(),
          supabase
            .from('documentos')
            .select('id, nombre_documento, vencimiento, estado')
            .eq('id_osc', organizationId),
          supabase
            .from('avisos')
            .select('estado')
            .eq('id_osc', organizationId)
            .order('fecha', { ascending: false })
            .limit(100),
          supabase
            .from('alertas_aml')
            .select('id, umbral, created_at')
            .eq('id_osc', organizationId)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('donaciones')
            .select('id_donacion, id_donante, created_at, cantidad')
            .eq('id_osc', organizationId)
            .order('created_at', { ascending: false }),
        ]);

        if (oscResponse.error) throw oscResponse.error;
        if (documentsResponse.error) throw documentsResponse.error;
        if (announcementsResponse.error) throw announcementsResponse.error;
        if (amlAlertsResponse.error) throw amlAlertsResponse.error;
        if (donationsResponse.error) throw donationsResponse.error;

        if (!isMounted) return;

        const donationRows = (donationsResponse.data ?? []) as DashboardDonation[];
        const donorIds = Array.from(new Set(
          donationRows
            .map((donation) => donation.id_donante)
            .filter((id): id is string => Boolean(id)),
        ));

        let donorRows: DashboardDonor[] = [];
        let directionRows: DashboardDirection[] = [];

        if (donorIds.length > 0) {
          const donorsResponse = await supabase
            .from('donantes')
            .select('id_donante, id_direccion')
            .in('id_donante', donorIds);

          if (donorsResponse.error) throw donorsResponse.error;

          donorRows = (donorsResponse.data ?? []) as DashboardDonor[];

          const directionIds = Array.from(new Set(
            donorRows
              .map((donor) => donor.id_direccion)
              .filter((id): id is string => Boolean(id)),
          ));

          if (directionIds.length > 0) {
            const directionsResponse = await supabase
              .from('direccion')
              .select('id_direccion, entidad_federativa')
              .in('id_direccion', directionIds);

            if (directionsResponse.error) throw directionsResponse.error;

            directionRows = (directionsResponse.data ?? []) as DashboardDirection[];
          }
        }

        const oscData = (oscResponse.data as OscProfile | null) ?? null;

        setOrganizationProfile(oscData);
        setOrganizationName(oscData?.nombre_organizacion?.trim() || localStorage.getItem('organization_name') || 'Organización');
        setDocuments((documentsResponse.data ?? []) as DashboardDocument[]);
        setAnnouncements((announcementsResponse.data ?? []) as DashboardAnnouncement[]);
        setAmlAlerts((amlAlertsResponse.data ?? []) as DashboardAlert[]);
        setDonations(donationRows);
        setDonors(donorRows);
        setDirections(directionRows);
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'No fue posible cargar el dashboard.';
        setLoadingError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadDashboardData();

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  const { pendingCount, approvedCount, inReviewCount, overdueCount } = useMemo(() => {
    const counters = {
      pendingCount: 0,
      approvedCount: 0,
      inReviewCount: 0,
      overdueCount: 0,
    };

    documents.forEach((document) => {
      const normalizedStatus = normalizeStatus(document.estado);
      if (normalizedStatus === 'approved') counters.approvedCount += 1;
      if (normalizedStatus === 'in_review') counters.inReviewCount += 1;
      if (normalizedStatus === 'pending') counters.pendingCount += 1;
      if (normalizedStatus === 'overdue') {
        counters.overdueCount += 1;
        counters.pendingCount += 1;
      }
    });

    return counters;
  }, [documents]);

  const unreadAnnouncementsCount = useMemo(() => announcements
    .filter((announcement) => (announcement.estado ?? '').trim().toLowerCase() !== 'leido').length, [announcements]);

  const donorsById = useMemo(() => donors.reduce<Record<string, DashboardDonor>>((accumulator, donor) => {
    accumulator[donor.id_donante] = donor;
    return accumulator;
  }, {}), [donors]);

  const directionsById = useMemo(() => directions.reduce<Record<string, string>>((accumulator, direction) => {
    accumulator[direction.id_direccion] = direction.entidad_federativa ?? '';
    return accumulator;
  }, {}), [directions]);

  const uniqueDonorIds = useMemo(() => Array.from(new Set(
    donations
      .map((donation) => donation.id_donante)
      .filter((id): id is string => Boolean(id)),
  )), [donations]);

  const donorsByState = useMemo(() => uniqueDonorIds.reduce<Record<string, number>>((accumulator, donorId) => {
    const donor = donorsById[donorId];
    if (!donor?.id_direccion) return accumulator;

    const stateName = directionsById[donor.id_direccion];
    const normalizedState = normalizeStateName(stateName);
    if (!normalizedState) return accumulator;

    accumulator[normalizedState] = (accumulator[normalizedState] ?? 0) + 1;
    return accumulator;
  }, {}), [uniqueDonorIds, donorsById, directionsById]);

  const donorMapStateData = useMemo(() => typedMexicoMap.locations.map((location) => {
    const normalizedLocation = normalizeStateName(location.name);
    return {
      ...location,
      canonicalName: normalizedLocation || location.name,
      total: donorsByState[normalizedLocation] ?? 0,
    };
  }), [donorsByState]);

  const maxDonorsPerState = useMemo(() => donorMapStateData.reduce((maxValue, stateEntry) => {
    return Math.max(maxValue, stateEntry.total);
  }, 0), [donorMapStateData]);

  const topStatesByDonors = useMemo(() => Object.entries(donorsByState)
    .map(([state, total]) => ({ state, total }))
    .sort((first, second) => second.total - first.total)
    .slice(0, 8), [donorsByState]);

  const documentsStatusChartData = useMemo(() => {
    const totalRejected = documents.filter((document) => normalizeStatus(document.estado) === 'rejected').length;

    return [
      { name: 'Pendientes', value: pendingCount, color: 'var(--color-orange-500)' },
      { name: 'En revisión', value: inReviewCount, color: 'var(--color-blue-500)' },
      { name: 'Aprobados', value: approvedCount, color: 'var(--color-emerald-500)' },
      { name: 'Rechazados', value: totalRejected, color: 'var(--color-rose-500)' },
    ].filter((entry) => entry.value > 0);
  }, [documents, pendingCount, inReviewCount, approvedCount]);

  const monthlyTrendData = useMemo(() => {
    const baseDate = new Date();
    const monthKeys: string[] = [];

    for (let index = 5; index >= 0; index -= 1) {
      const currentDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - index, 1);
      monthKeys.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
    }

    const monthlyAccumulator = monthKeys.reduce<Record<string, { donations: number; alerts: number }>>((accumulator, key) => {
      accumulator[key] = { donations: 0, alerts: 0 };
      return accumulator;
    }, {});

    donations.forEach((donation) => {
      const donationDate = new Date(donation.created_at);
      const key = `${donationDate.getFullYear()}-${String(donationDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyAccumulator[key]) {
        monthlyAccumulator[key].donations += Number(donation.cantidad ?? 0);
      }
    });

    amlAlerts.forEach((alert) => {
      if (!alert.created_at) return;
      const alertDate = new Date(alert.created_at);
      const key = `${alertDate.getFullYear()}-${String(alertDate.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyAccumulator[key]) {
        monthlyAccumulator[key].alerts += 1;
      }
    });

    return monthKeys.map((key) => {
      const [year, month] = key.split('-');
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('es-MX', {
        month: 'short',
      });

      return {
        month: label.charAt(0).toUpperCase() + label.slice(1),
        donaciones: Number(monthlyAccumulator[key].donations.toFixed(2)),
        alertas: monthlyAccumulator[key].alerts,
      };
    });
  }, [donations, amlAlerts]);

  const upcomingDeadlines = useMemo(() => documents
    .filter((document) => Boolean(document.vencimiento))
    .map((document) => {
      const dueDate = document.vencimiento as string;
      const hoursLeft = getHoursUntilDate(dueDate);
      return {
        id: document.id,
        document: document.nombre_documento?.trim() || 'Documento sin nombre',
        dueDate,
        status: normalizeStatus(document.estado),
        daysLeft: getDaysUntilDate(dueDate),
        hoursLeft,
      };
    })
    .filter((document) => document.status === 'pending' || document.status === 'overdue')
    .sort((first, second) => new Date(first.dueDate).getTime() - new Date(second.dueDate).getTime())
    .slice(0, 3), [documents]);

  const totalDocuments = documents.length;
  const compliancePercentage = totalDocuments > 0
    ? Math.round((approvedCount / totalDocuments) * 100)
    : 0;

  const latestAmlAlert = amlAlerts[0] ?? null;

  const donationMetrics = useMemo(() => {
    const totalDonationsAmount = donations.reduce((accumulator, donation) => accumulator + Number(donation.cantidad ?? 0), 0);
    const donationsCount = donations.length;
    const averageDonation = donationsCount > 0 ? totalDonationsAmount / donationsCount : 0;

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

    return {
      totalDonationsAmount,
      averageDonation,
      currentMonthAmount,
      donationsCount,
    };
  }, [donations]);

  const amlByThresholdChartData = useMemo(() => {
    const grouped = amlAlerts.reduce<Record<string, number>>((accumulator, alert) => {
      const key = alert.umbral === 1 ? 'Umbral 1' : alert.umbral === 2 ? 'Umbral 2' : `Umbral ${alert.umbral}`;
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [amlAlerts]);

  const operationVolumeChartData = useMemo(() => ([
    { name: 'Documentos', total: documents.length },
    { name: 'Avisos', total: announcements.length },
    { name: 'Alertas AML', total: amlAlerts.length },
    { name: 'Donaciones', total: donations.length },
  ]), [documents.length, announcements.length, amlAlerts.length, donations.length]);

  const summaryQuickActions = [
    {
      label: 'Documentos Pendientes',
      value: String(pendingCount),
      icon: Clock,
      color: 'orange',
      description: overdueCount > 0 ? `${overdueCount} con atraso` : 'Sin atrasos críticos',
      to: '/organization/documents',
    },
    {
      label: 'Documentos Aprobados',
      value: String(approvedCount),
      icon: CheckCircle2,
      color: 'green',
      description: `De ${totalDocuments} documentos`,
      to: '/organization/documents',
    },
    {
      label: 'Avisos No Leídos',
      value: String(unreadAnnouncementsCount),
      icon: Bell,
      color: 'blue',
      description: 'Nuevos avisos por revisar',
      to: '/organization/announcements',
    },
    {
      label: 'Alertas AML',
      value: String(amlAlerts.length),
      icon: ShieldAlert,
      color: 'purple',
      description: latestAmlAlert ? `Último umbral: ${latestAmlAlert.umbral}` : 'Sin alertas registradas',
      to: '/organization/donations',
    },
  ] as const;

  const hasUpcomingDeadlines = upcomingDeadlines.length > 0;

  const renderQuickActionsCard = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
      <div className="space-y-3">
        {summaryQuickActions.map((action) => {
          const Icon = action.icon;
          const colorClasses = {
            orange: 'bg-orange-100 text-orange-600',
            green: 'bg-emerald-100 text-emerald-600',
            blue: 'bg-blue-100 text-blue-600',
            purple: 'bg-purple-100 text-purple-600',
          }[action.color];

          return (
            <Link
              key={action.label}
              to={action.to}
              className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-emerald-600 hover:bg-emerald-50 transition group"
            >
              <div className={`w-9 h-9 ${colorClasses} rounded-lg flex items-center justify-center transition`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 text-sm">{action.label}</p>
                <p className="text-xl leading-tight font-bold text-gray-900">{action.value}</p>
                <p className="text-xs text-gray-600">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-6 sm:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Bienvenido, {organizationName}
        </h1>
        <p className="text-emerald-50">
          Mantén tu organización en cumplimiento con las regulaciones AML
        </p>
        {organizationProfile && (
          <div className="mt-3 text-sm text-emerald-100 flex flex-wrap gap-x-4 gap-y-1">
            <span>Verificación: {organizationProfile.estado_verificacion?.trim() || 'Sin estado'}</span>
            <span>Riesgo: {organizationProfile.riesgo?.trim() || 'No definido'}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-sm text-gray-600">
          Cargando información del dashboard...
        </div>
      )}

      {loadingError && !loading && (
        <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6 text-sm text-red-700">
          {loadingError}
        </div>
      )}

      {!loading && !loadingError && (
        <>

      {hasUpcomingDeadlines && (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Próximos Vencimientos</h2>
            <Link
              to="/organization/documents"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Ver documentos
            </Link>
          </div>
          <p className="text-sm text-gray-600 mb-4">Haz clic en un vencimiento para abrir el módulo de documentos.</p>
          <div className="space-y-4">
            {upcomingDeadlines.map((deadline) => (
              <Link
                key={deadline.id}
                to="/organization/documents"
                className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-emerald-300 transition cursor-pointer"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  deadline.daysLeft <= 5 ? 'bg-red-100' : 'bg-orange-100'
                }`}>
                  <FileText className={`w-5 h-5 ${
                    deadline.daysLeft <= 5 ? 'text-red-600' : 'text-orange-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 mb-1">
                    {deadline.document}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Vence: {new Date(deadline.dueDate).toLocaleDateString('es-MX')}
                  </p>
                  <p className={`text-xs font-medium mt-1 ${
                    deadline.daysLeft <= 5 ? 'text-red-600' : 'text-orange-600'
                  }`}>
                    {deadline.hoursLeft > 0 && deadline.hoursLeft < 24
                      ? `${deadline.hoursLeft} hora(s) restantes`
                      : deadline.hoursLeft <= 0 && deadline.hoursLeft > -24
                        ? `${Math.abs(deadline.hoursLeft)} hora(s) de atraso`
                        : deadline.daysLeft < 0
                          ? `${Math.abs(deadline.daysLeft)} día(s) de atraso`
                          : `${deadline.daysLeft} días restantes`}
                  </p>
                </div>
              </Link>
            ))}
            {upcomingDeadlines.length === 0 && (
              <p className="text-sm text-gray-500">No hay vencimientos pendientes por ahora.</p>
            )}
          </div>
        </div>

        {renderQuickActionsCard()}
      </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen Financiero</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Total Donado Histórico</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(donationMetrics.totalDonationsAmount)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Promedio por Donación</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(donationMetrics.averageDonation)}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Donado este Mes</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(donationMetrics.currentMonthAmount)}</p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertas por Umbral</h2>
          <div className="h-48">
            {amlByThresholdChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={amlByThresholdChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                  <XAxis dataKey="name" stroke="var(--color-gray-500)" />
                  <YAxis stroke="var(--color-gray-500)" allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" name="Alertas" fill="var(--color-purple-500)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                Sin alertas AML en el periodo.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Tendencia 6 Meses</h2>
          <p className="text-sm text-gray-600 mb-4">Compara montos de donación contra alertas AML generadas</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
                <XAxis dataKey="month" stroke="var(--color-gray-500)" />
                <YAxis yAxisId="left" stroke="var(--color-gray-500)" />
                <YAxis yAxisId="right" orientation="right" stroke="var(--color-gray-500)" allowDecimals={false} />
                <Tooltip />
                <Bar yAxisId="left" dataKey="donaciones" name="Donaciones (MXN)" fill="var(--color-emerald-500)" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="right" dataKey="alertas" name="Alertas AML" fill="var(--color-amber-500)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribución de Documentos</h2>
          <p className="text-sm text-gray-600 mb-4">Estado actual de la carga documental de la organización</p>
          <div className="h-72">
            {documentsStatusChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={documentsStatusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  >
                    {documentsStatusChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-500">
                No hay datos documentales para graficar.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Concentracion de Donantes por Estado</h2>
          <p className="text-sm text-gray-600 mb-4">
            Mapa de Mexico con intensidad por numero de donantes unicos de tu organizacion por entidad federativa.
          </p>

          <div className="relative rounded-lg border border-teal-100 bg-gradient-to-b from-white to-teal-50 p-3">
            {hoveredState ? (
              <div className="absolute right-3 top-3 rounded-lg bg-white/95 border border-gray-200 px-3 py-2 text-xs shadow-sm">
                <p className="font-semibold text-gray-900">{hoveredState.name}</p>
                <p className="text-gray-600">{hoveredState.total} donantes</p>
              </div>
            ) : null}

            <svg viewBox={typedMexicoMap.viewBox} className="w-full h-auto" role="img" aria-label="Mapa de concentracion de donantes en Mexico">
              {donorMapStateData.map((stateEntry) => (
                <path
                  key={stateEntry.id}
                  d={stateEntry.path}
                  fill={getStateFillColor(stateEntry.total, maxDonorsPerState)}
                  stroke="#0f766e"
                  strokeWidth={0.8}
                  className="transition-colors duration-200 hover:fill-teal-700"
                  onMouseEnter={() => setHoveredState({ name: stateEntry.canonicalName, total: stateEntry.total })}
                  onMouseLeave={() => setHoveredState(null)}
                />
              ))}
            </svg>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span className="font-medium text-gray-700">Intensidad:</span>
            <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded bg-cyan-50 border border-cyan-200" />0</span>
            <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded bg-teal-200 border border-teal-300" />Baja</span>
            <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded bg-teal-400 border border-teal-500" />Media</span>
            <span className="inline-flex items-center gap-1"><span className="w-4 h-4 rounded bg-teal-700 border border-teal-800" />Alta</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Estados con Mayor Concentracion</h2>
          <p className="text-sm text-gray-600 mb-4">Top de entidades con mas donantes unicos de tu organizacion.</p>

          <div className="space-y-3">
            {topStatesByDonors.map((stateItem, index) => {
              const width = maxDonorsPerState > 0
                ? `${Math.max(8, Math.round((stateItem.total / maxDonorsPerState) * 100))}%`
                : '8%';

              return (
                <div key={stateItem.state} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <p className="text-gray-700 font-medium">{index + 1}. {stateItem.state}</p>
                    <p className="text-gray-900 font-semibold">{stateItem.total}</p>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 rounded-full bg-teal-500" style={{ width }} />
                  </div>
                </div>
              );
            })}
          </div>

          {topStatesByDonors.length === 0 && (
            <p className="text-sm text-gray-500">No hay direcciones de donantes suficientes para calcular concentracion.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Volumen Operativo</h2>
        <p className="text-sm text-gray-600 mb-4">Comparativo de registros cargados en cada módulo</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={operationVolumeChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-gray-200)" />
              <XAxis dataKey="name" stroke="var(--color-gray-500)" />
              <YAxis stroke="var(--color-gray-500)" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="total" name="Registros" fill="var(--color-teal-500)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {!hasUpcomingDeadlines && renderQuickActionsCard()}

      {/* Compliance Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Estado de Cumplimiento</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Documentación Completa</span>
              <span className="text-sm font-medium text-emerald-600">{compliancePercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${compliancePercentage}%` }}></div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900 mb-1">
                Atención Requerida
              </p>
              <p className="text-sm text-yellow-700">
                {pendingCount > 0
                  ? `Tienes ${pendingCount} documento(s) pendiente(s) o atrasado(s). Revisa la sección de documentos para mantener tu cumplimiento al día.`
                  : 'No hay documentos pendientes. Mantén tu monitoreo activo para conservar el cumplimiento.'}
              </p>
            </div>
          </div>
          {inReviewCount > 0 && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  Documentos en Revisión
                </p>
                <p className="text-sm text-blue-700">
                  Actualmente tienes {inReviewCount} documento(s) en revisión por parte del equipo de cumplimiento.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

        </>
      )}
    </div>
  );
}
