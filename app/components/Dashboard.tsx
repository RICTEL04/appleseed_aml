// components/Dashboard.tsx
// Este componente es el dashboard principal para los trabajadores, muestra métricas 
// clave como número de organizaciones registradas, alertas AML, cobertura de verificación y donaciones del mes,
// además de gráficos de tendencias, distribución de riesgos, estado de documentos y alertas por umbral,
// también incluye una sección de acciones inmediatas para dar seguimiento a los casos más urgentes y una tabla con las organizaciones más recientes.
"use client"
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Building2, AlertTriangle, CheckCircle2, TrendingUp, Loader2, ShieldAlert, Send, FileCheck2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { useWorker } from '@/app/hooks/useWorker';
import mexicoMap from '@svg-maps/mexico';

interface DashboardOrganization {
  id_osc: string;
  id_direccion: string | null;
  nombre_organizacion: string | null;
  estado_verificacion: string | null;
  riesgo: string | null;
  created_at: string;
}

interface DashboardDirection {
  id_direccion: string;
  entidad_federativa: string | null;
}

interface DashboardDocument {
  id: string;
  id_osc: string | null;
  estado: string | null;
  vencimiento: string | null;
  nombre_documento: string | null;
  created_at: string;
  id_trabajador: string | null;
}

interface DashboardAmlAlert {
  id: string;
  id_osc: string;
  umbral: number;
  monto_acumulado: number;
  created_at: string | null;
}

interface DashboardDonation {
  id_donacion: string;
  id_osc: string | null;
  cantidad: number | null;
  created_at: string;
}

interface DashboardAnnouncement {
  id_aviso: string;
  estado: string | null;
  urgencia: string | null;
  remitente: string | null;
  fecha: string | null;
}

interface ImmediateAction {
  id: string;
  action: string;
  organization: string;
  priority: 'Alta' | 'Media' | 'Baja';
  date: string;
  route: string;
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

const normalizeOrgStatus = (status: string | null) => {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'verificada') return 'Verificada';
  if (normalized === 'en revisión' || normalized === 'en revision') return 'En revisión';
  return 'Pendiente';
};

const normalizeRisk = (risk: string | null): 'Bajo' | 'Medio' | 'Alto' => {
  const normalized = (risk ?? '').trim().toLowerCase();
  if (normalized === 'alto') return 'Alto';
  if (normalized === 'medio') return 'Medio';
  return 'Bajo';
};

const normalizeDocumentStatus = (status: string | null): 'aprobado' | 'rechazado' | 'en revisión' | 'pendiente' => {
  const normalized = (status ?? '').trim().toLowerCase();
  if (normalized === 'aprobado') return 'aprobado';
  if (normalized === 'rechazado') return 'rechazado';
  if (normalized === 'en revisión' || normalized === 'en revision') return 'en revisión';
  return 'pendiente';
};

const formatCurrency = (amount: number) => amount.toLocaleString('es-MX', {
  style: 'currency',
  currency: 'MXN',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const getMonthKey = (dateValue: string) => {
  const date = new Date(dateValue);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

const PRIORITY_ORDER: Record<ImmediateAction['priority'], number> = {
  Alta: 0,
  Media: 1,
  Baja: 2,
};

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

export function Dashboard() {
  const { worker } = useWorker();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<DashboardOrganization[]>([]);
  const [directions, setDirections] = useState<DashboardDirection[]>([]);
  const [documents, setDocuments] = useState<DashboardDocument[]>([]);
  const [amlAlerts, setAmlAlerts] = useState<DashboardAmlAlert[]>([]);
  const [donations, setDonations] = useState<DashboardDonation[]>([]);
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);
  const [hoveredState, setHoveredState] = useState<{ name: string; total: number } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setError('Configura Supabase para visualizar el dashboard.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabaseClient();
        const [orgResponse, directionsResponse, docsResponse, alertsResponse, donationsResponse, announcementsResponse] = await Promise.all([
          supabase
            .from('osc')
            .select('id_osc, id_direccion, nombre_organizacion, estado_verificacion, riesgo, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('direccion')
            .select('id_direccion, entidad_federativa'),
          supabase
            .from('documentos')
            .select('id, id_osc, estado, vencimiento, nombre_documento, created_at, id_trabajador')
            .order('created_at', { ascending: false }),
          supabase
            .from('alertas_aml')
            .select('id, id_osc, umbral, monto_acumulado, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('donaciones')
            .select('id_donacion, id_osc, cantidad, created_at')
            .order('created_at', { ascending: false }),
          supabase
            .from('avisos')
            .select('id_aviso, estado, urgencia, remitente, fecha')
            .order('fecha', { ascending: false })
            .limit(200),
        ]);

        if (orgResponse.error) throw orgResponse.error;
        if (directionsResponse.error) throw directionsResponse.error;
        if (docsResponse.error) throw docsResponse.error;
        if (alertsResponse.error) throw alertsResponse.error;
        if (donationsResponse.error) throw donationsResponse.error;
        if (announcementsResponse.error) throw announcementsResponse.error;

        if (!isMounted) return;

        setOrganizations((orgResponse.data ?? []) as DashboardOrganization[]);
        setDirections((directionsResponse.data ?? []) as DashboardDirection[]);
        setDocuments((docsResponse.data ?? []) as DashboardDocument[]);
        setAmlAlerts((alertsResponse.data ?? []) as DashboardAmlAlert[]);
        setDonations((donationsResponse.data ?? []) as DashboardDonation[]);
        setAnnouncements((announcementsResponse.data ?? []) as DashboardAnnouncement[]);
      } catch (loadError) {
        if (!isMounted) return;
        const message = loadError instanceof Error ? loadError.message : 'No se pudo cargar el dashboard';
        setError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const organizationsById = useMemo(() => organizations.reduce<Record<string, string>>((acc, org) => {
    acc[org.id_osc] = org.nombre_organizacion?.trim() || 'Organización sin nombre';
    return acc;
  }, {}), [organizations]);

  const organizationsRiskById = useMemo(() => organizations.reduce<Record<string, 'Bajo' | 'Medio' | 'Alto'>>((acc, org) => {
    acc[org.id_osc] = normalizeRisk(org.riesgo);
    return acc;
  }, {}), [organizations]);

  const directionsById = useMemo(() => directions.reduce<Record<string, string>>((acc, direction) => {
    acc[direction.id_direccion] = direction.entidad_federativa ?? '';
    return acc;
  }, {}), [directions]);

  const organizationsByState = useMemo(() => organizations.reduce<Record<string, number>>((acc, organization) => {
    if (!organization.id_direccion) return acc;
    const stateName = directionsById[organization.id_direccion];
    const normalizedState = normalizeStateName(stateName);

    if (!normalizedState) return acc;

    acc[normalizedState] = (acc[normalizedState] ?? 0) + 1;
    return acc;
  }, {}), [organizations, directionsById]);

  const mapStateData = useMemo(() => typedMexicoMap.locations.map((location) => {
    const normalizedLocation = normalizeStateName(location.name);
    return {
      ...location,
      canonicalName: normalizedLocation || location.name,
      total: organizationsByState[normalizedLocation] ?? 0,
    };
  }), [organizationsByState]);

  const maxOrganizationsPerState = useMemo(() => mapStateData.reduce((maxValue, stateEntry) => {
    return Math.max(maxValue, stateEntry.total);
  }, 0), [mapStateData]);

  const topStatesByOrganizations = useMemo(() => Object.entries(organizationsByState)
    .map(([state, total]) => ({ state, total }))
    .sort((first, second) => second.total - first.total)
    .slice(0, 8), [organizationsByState]);

  const verificationMetrics = useMemo(() => {
    const total = organizations.length;
    const verified = organizations.filter((org) => normalizeOrgStatus(org.estado_verificacion) === 'Verificada').length;
    const inReview = organizations.filter((org) => normalizeOrgStatus(org.estado_verificacion) === 'En revisión').length;
    const pending = total - verified - inReview;

    return {
      total,
      verified,
      inReview,
      pending,
      coverage: total > 0 ? Math.round((verified / total) * 100) : 0,
    };
  }, [organizations]);

  const donationMetrics = useMemo(() => {
    const totalAmount = donations.reduce((acc, donation) => acc + Number(donation.cantidad ?? 0), 0);
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();

    const thisMonthAmount = donations.reduce((acc, donation) => {
      const date = new Date(donation.created_at);
      if (date.getMonth() === month && date.getFullYear() === year) {
        return acc + Number(donation.cantidad ?? 0);
      }
      return acc;
    }, 0);

    return {
      totalAmount,
      thisMonthAmount,
      totalCount: donations.length,
    };
  }, [donations]);

  const performanceMetrics = useMemo(() => {
    const reviewedByCurrentWorker = worker
      ? documents.filter((doc) => doc.id_trabajador === worker.id_trabajador)
      : [];

    const approvedByCurrentWorker = reviewedByCurrentWorker.filter((doc) => normalizeDocumentStatus(doc.estado) === 'aprobado').length;
    const approvalRate = reviewedByCurrentWorker.length > 0
      ? Math.round((approvedByCurrentWorker / reviewedByCurrentWorker.length) * 100)
      : 0;

    const announcementsByCurrentWorker = worker?.nombre
      ? announcements.filter((announcement) => (announcement.remitente ?? '').trim() === worker.nombre.trim()).length
      : 0;

    const unreadAnnouncements = announcements
      .filter((announcement) => (announcement.estado ?? '').trim().toLowerCase() !== 'leido')
      .length;

    return {
      reviewedByCurrentWorker: reviewedByCurrentWorker.length,
      approvedByCurrentWorker,
      approvalRate,
      announcementsByCurrentWorker,
      unreadAnnouncements,
    };
  }, [documents, worker, announcements]);

  const riskData = useMemo(() => {
    const counters = organizations.reduce<Record<'Bajo' | 'Medio' | 'Alto', number>>((acc, org) => {
      const risk = normalizeRisk(org.riesgo);
      acc[risk] += 1;
      return acc;
    }, { Bajo: 0, Medio: 0, Alto: 0 });

    return [
      { name: 'Bajo', value: counters.Bajo, color: '#10b981' },
      { name: 'Medio', value: counters.Medio, color: '#f59e0b' },
      { name: 'Alto', value: counters.Alto, color: '#ef4444' },
    ].filter((entry) => entry.value > 0);
  }, [organizations]);

  const monthlyTrendData = useMemo(() => {
    const baseDate = new Date();
    const monthKeys: string[] = [];

    for (let index = 5; index >= 0; index -= 1) {
      const currentDate = new Date(baseDate.getFullYear(), baseDate.getMonth() - index, 1);
      monthKeys.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
    }

    const accumulator = monthKeys.reduce<Record<string, { nuevasOsc: number; alertas: number }>>((acc, key) => {
      acc[key] = { nuevasOsc: 0, alertas: 0 };
      return acc;
    }, {});

    organizations.forEach((org) => {
      const key = getMonthKey(org.created_at);
      if (accumulator[key]) accumulator[key].nuevasOsc += 1;
    });

    amlAlerts.forEach((alert) => {
      if (!alert.created_at) return;
      const key = getMonthKey(alert.created_at);
      if (accumulator[key]) accumulator[key].alertas += 1;
    });

    return monthKeys.map((key) => {
      const [year, month] = key.split('-');
      const label = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('es-MX', { month: 'short' });
      return {
        month: label.charAt(0).toUpperCase() + label.slice(1),
        nuevasOsc: accumulator[key].nuevasOsc,
        alertas: accumulator[key].alertas,
      };
    });
  }, [organizations, amlAlerts]);

  const documentsByStatusData = useMemo(() => {
    const counters = documents.reduce<Record<'aprobado' | 'rechazado' | 'en revisión' | 'pendiente', number>>((acc, doc) => {
      const status = normalizeDocumentStatus(doc.estado);
      acc[status] += 1;
      return acc;
    }, { aprobado: 0, rechazado: 0, 'en revisión': 0, pendiente: 0 });

    return [
      { status: 'Aprobado', total: counters.aprobado, color: '#10b981' },
      { status: 'En revisión', total: counters['en revisión'], color: '#3b82f6' },
      { status: 'Pendiente', total: counters.pendiente, color: '#f59e0b' },
      { status: 'Rechazado', total: counters.rechazado, color: '#ef4444' },
    ];
  }, [documents]);

  const alertsByThresholdData = useMemo(() => {
    const grouped = amlAlerts.reduce<Record<string, number>>((acc, alert) => {
      const key = `Umbral ${alert.umbral}`;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([threshold, total]) => ({ threshold, total }))
      .sort((first, second) => first.threshold.localeCompare(second.threshold));
  }, [amlAlerts]);

  const donationsByRiskData = useMemo(() => {
    const riskTotals = donations.reduce<Record<'Bajo' | 'Medio' | 'Alto', number>>((acc, donation) => {
      if (!donation.id_osc) return acc;
      const risk = organizationsRiskById[donation.id_osc] ?? 'Bajo';
      acc[risk] += Number(donation.cantidad ?? 0);
      return acc;
    }, { Bajo: 0, Medio: 0, Alto: 0 });

    return [
      { name: 'Bajo', value: Number(riskTotals.Bajo.toFixed(2)), color: '#10b981' },
      { name: 'Medio', value: Number(riskTotals.Medio.toFixed(2)), color: '#f59e0b' },
      { name: 'Alto', value: Number(riskTotals.Alto.toFixed(2)), color: '#ef4444' },
    ].filter((entry) => entry.value > 0);
  }, [donations, organizationsRiskById]);

  const immediateActions = useMemo<ImmediateAction[]>(() => {
    const actions: ImmediateAction[] = [];

    amlAlerts
      .filter((alert) => alert.umbral >= 2)
      .slice(0, 4)
      .forEach((alert) => {
        actions.push({
          id: `alert-${alert.id}`,
          action: `Revisar alerta AML (Umbral ${alert.umbral})`,
          organization: organizationsById[alert.id_osc] ?? 'Organización no encontrada',
          priority: 'Alta',
          date: alert.created_at ?? new Date().toISOString(),
          route: '/organizations',
        });
      });

    documents
      .filter((doc) => {
        const status = normalizeDocumentStatus(doc.estado);
        return status === 'pendiente' || status === 'en revisión' || status === 'rechazado';
      })
      .slice(0, 5)
      .forEach((doc) => {
        const status = normalizeDocumentStatus(doc.estado);
        const isHigh = status === 'rechazado' || (doc.vencimiento ? new Date(doc.vencimiento).getTime() < Date.now() : false);

        actions.push({
          id: `doc-${doc.id}`,
          action: status === 'rechazado'
            ? 'Dar seguimiento a documento rechazado'
            : status === 'en revisión'
              ? 'Cerrar revisión documental en curso'
              : 'Revisar documento pendiente',
          organization: doc.id_osc ? (organizationsById[doc.id_osc] ?? 'Organización no encontrada') : 'Organización no encontrada',
          priority: isHigh ? 'Alta' : 'Media',
          date: doc.vencimiento ?? doc.created_at,
          route: '/organizations',
        });
      });

    organizations
      .filter((org) => normalizeOrgStatus(org.estado_verificacion) !== 'Verificada')
      .slice(0, 5)
      .forEach((org) => {
        actions.push({
          id: `org-${org.id_osc}`,
          action: normalizeOrgStatus(org.estado_verificacion) === 'En revisión'
            ? 'Resolver organización en revisión'
            : 'Validar organización pendiente',
          organization: org.nombre_organizacion?.trim() || 'Organización sin nombre',
          priority: normalizeOrgStatus(org.estado_verificacion) === 'En revisión' ? 'Media' : 'Baja',
          date: org.created_at,
          route: '/organizations',
        });
      });

    return actions
      .sort((first, second) => {
        const priorityDiff = PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(second.date).getTime() - new Date(first.date).getTime();
      })
      .slice(0, 8);
  }, [amlAlerts, documents, organizations, organizationsById]);

  const recentOrganizations = useMemo(() => organizations.slice(0, 6), [organizations]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando dashboard del trabajador...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <p className="font-medium mb-2">No fue posible cargar el dashboard</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-6 sm:p-8 text-white">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          Bienvenido, a Appleseed Mexico
        </h1>
        <p className="text-emerald-50">
          Panorama general de organizaciones, alertas AML y prioridades operativas del día.
        </p>
        <div className="mt-3 text-sm text-emerald-100 flex flex-wrap gap-x-4 gap-y-1">
          <span>{worker?.nombre || 'equipo de cumplimiento'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">OSC Registradas</p>
          <p className="text-3xl font-bold text-gray-900">{verificationMetrics.total}</p>
          <p className="text-emerald-600 text-sm mt-2">{verificationMetrics.verified} verificadas</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Alertas AML</p>
          <p className="text-3xl font-bold text-gray-900">{amlAlerts.length}</p>
          <p className="text-red-600 text-sm mt-2">{immediateActions.filter((item) => item.priority === 'Alta').length} acciones alta prioridad</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Cobertura Verificación</p>
          <p className="text-3xl font-bold text-gray-900">{verificationMetrics.coverage}%</p>
          <p className="text-blue-600 text-sm mt-2">{verificationMetrics.inReview} en revisión · {verificationMetrics.pending} pendientes</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-1">Donaciones del Mes</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(donationMetrics.thisMonthAmount)}</p>
          <p className="text-purple-600 text-sm mt-2">{donationMetrics.totalCount} donaciones registradas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Tendencia Operativa (6 meses)</h2>
          <p className="text-sm text-gray-600 mb-6">Nuevas OSC registradas vs alertas AML generadas.</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="nuevasOsc" fill="#14b8a6" radius={[8, 8, 0, 0]} name="Nuevas OSC" />
              <Bar dataKey="alertas" fill="#f59e0b" radius={[8, 8, 0, 0]} name="Alertas AML" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Distribución por Nivel de Riesgo</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {riskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Estado Documental</h2>
          <p className="text-sm text-gray-600 mb-4">Distribución de documentos por estado operativo.</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={documentsByStatusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="status" stroke="#6b7280" />
              <YAxis allowDecimals={false} stroke="#6b7280" />
              <Tooltip />
              <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                {documentsByStatusData.map((entry) => (
                  <Cell key={entry.status} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Alertas por Umbral</h2>
          <p className="text-sm text-gray-600 mb-4">Frecuencia de alertas AML por tipo de umbral.</p>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={alertsByThresholdData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="threshold" stroke="#6b7280" />
              <YAxis allowDecimals={false} stroke="#6b7280" />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Donaciones por Riesgo</h2>
          <p className="text-sm text-gray-600 mb-4">Monto donado acumulado según perfil de riesgo OSC.</p>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={donationsByRiskData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={78}
                label={({ name, value }) => `${name} ${formatCurrency(Number(value ?? 0))}`}
              >
                {donationsByRiskData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
          {donationsByRiskData.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">Aún no hay donaciones vinculadas a OSC para graficar.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Concentracion de OSC por Estado</h2>
          <p className="text-sm text-gray-600 mb-4">
            Mapa de Mexico con intensidad por numero de organizaciones registradas por entidad federativa.
          </p>

          <div className="relative rounded-lg border border-teal-100 bg-gradient-to-b from-white to-teal-50 p-3">
            {hoveredState ? (
              <div className="absolute right-3 top-3 rounded-lg bg-white/95 border border-gray-200 px-3 py-2 text-xs shadow-sm">
                <p className="font-semibold text-gray-900">{hoveredState.name}</p>
                <p className="text-gray-600">{hoveredState.total} OSC</p>
              </div>
            ) : null}

            <svg viewBox={typedMexicoMap.viewBox} className="w-full h-auto" role="img" aria-label="Mapa de concentracion de organizaciones en Mexico">
              {mapStateData.map((stateEntry) => (
                <path
                  key={stateEntry.id}
                  d={stateEntry.path}
                  fill={getStateFillColor(stateEntry.total, maxOrganizationsPerState)}
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
          <p className="text-sm text-gray-600 mb-4">Top de entidades federativas con mas OSC registradas.</p>

          <div className="space-y-3">
            {topStatesByOrganizations.map((stateItem, index) => {
              const width = maxOrganizationsPerState > 0
                ? `${Math.max(8, Math.round((stateItem.total / maxOrganizationsPerState) * 100))}%`
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

          {topStatesByOrganizations.length === 0 && (
            <p className="text-sm text-gray-500">No hay ubicaciones de estado suficientes para calcular concentracion.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Acciones Inmediatas</h2>
            <Link to="/organizations" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              Ir a Organizaciones
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Acción</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Organización</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Prioridad</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {immediateActions.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4 text-gray-900 text-sm font-medium">{item.action}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{item.organization}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        item.priority === 'Alta'
                          ? 'bg-red-100 text-red-700'
                          : item.priority === 'Media'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-700">
                      {new Date(item.date).toLocaleDateString('es-MX', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {immediateActions.length === 0 && (
            <div className="mt-4 text-sm text-gray-500">No hay acciones urgentes por ahora.</div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Desempeño</h2>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <FileCheck2 className="w-4 h-4 text-emerald-600" />
              <p className="text-sm font-medium">Revisiones realizadas</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{performanceMetrics.reviewedByCurrentWorker}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-medium">Tasa de aprobación</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{performanceMetrics.approvalRate}%</p>
            <p className="text-xs text-gray-500 mt-1">{performanceMetrics.approvedByCurrentWorker} aprobados por ti</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <Send className="w-4 h-4 text-purple-600" />
              <p className="text-sm font-medium">Avisos enviados</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{performanceMetrics.announcementsByCurrentWorker}</p>
            <p className="text-xs text-gray-500 mt-1">{performanceMetrics.unreadAnnouncements} avisos no leídos en el sistema</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center gap-2 text-gray-700 mb-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <p className="text-sm font-medium">Riesgo monitoreado</p>
            </div>
            <p className="text-base font-semibold text-gray-900">{formatCurrency(donationMetrics.totalAmount)}</p>
            <p className="text-xs text-gray-500 mt-1">Monto histórico de donaciones observado</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Organizaciones Recientes</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Organización</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Estado</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Nivel de Riesgo</th>
              </tr>
            </thead>
            <tbody>
              {recentOrganizations.map((org) => {
                const status = normalizeOrgStatus(org.estado_verificacion);
                const risk = normalizeRisk(org.riesgo);

                return (
                <tr key={org.id_osc} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4 text-gray-900">{org.nombre_organizacion || 'Sin nombre'}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      status === 'Verificada' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : status === 'En revisión'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                    }`}>
                      {status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                      risk === 'Bajo' 
                        ? 'bg-green-100 text-green-700' 
                        : risk === 'Medio'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {risk}
                    </span>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
