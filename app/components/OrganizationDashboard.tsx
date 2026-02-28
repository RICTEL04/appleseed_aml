import { CheckCircle2, Clock, AlertTriangle, FileText, Bell, MessageSquare } from 'lucide-react';
import { Link } from 'react-router';

const stats = [
  {
    label: 'Documentos Pendientes',
    value: '3',
    icon: Clock,
    color: 'orange',
    description: 'Documentos por entregar',
  },
  {
    label: 'Documentos Aprobados',
    value: '12',
    icon: CheckCircle2,
    color: 'green',
    description: 'Total de documentos',
  },
  {
    label: 'Avisos No Leídos',
    value: '2',
    icon: Bell,
    color: 'blue',
    description: 'Nuevos avisos',
  },
  {
    label: 'Mensajes Nuevos',
    value: '1',
    icon: MessageSquare,
    color: 'purple',
    description: 'Sin responder',
  },
];

const recentAnnouncements = [
  {
    id: 1,
    title: 'Actualización de Políticas AML',
    date: '2026-02-18',
    priority: 'high',
    excerpt: 'Nueva regulación sobre reportes trimestrales de actividades...',
  },
  {
    id: 2,
    title: 'Fecha límite para documentos Q1',
    date: '2026-02-15',
    priority: 'medium',
    excerpt: 'Recordatorio: Los documentos del primer trimestre deben ser entregados...',
  },
];

const upcomingDeadlines = [
  {
    id: 1,
    document: 'Reporte Trimestral Q1 2026',
    dueDate: '2026-02-28',
    status: 'pending',
    daysLeft: 8,
  },
  {
    id: 2,
    document: 'Estados Financieros Enero',
    dueDate: '2026-02-25',
    status: 'pending',
    daysLeft: 5,
  },
  {
    id: 3,
    document: 'Certificado de Donaciones',
    dueDate: '2026-03-05',
    status: 'pending',
    daysLeft: 13,
  },
];

export function OrganizationDashboard() {
  const organizationName = localStorage.getItem('organization_name') || '';

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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colorClasses = {
            orange: 'bg-orange-100 text-orange-600',
            green: 'bg-emerald-100 text-emerald-600',
            blue: 'bg-blue-100 text-blue-600',
            purple: 'bg-purple-100 text-purple-600',
          }[stat.color];

          return (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${colorClasses} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-gray-500 text-sm mt-2">{stat.description}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Avisos Recientes</h2>
            <Link
              to="/organization/announcements"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Ver todos
            </Link>
          </div>
          <div className="space-y-4">
            {recentAnnouncements.map((announcement) => (
              <div
                key={announcement.id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition cursor-pointer"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900">{announcement.title}</h3>
                  {announcement.priority === 'high' && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Urgente
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">{announcement.excerpt}</p>
                <p className="text-xs text-gray-500">
                  {new Date(announcement.date).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Próximos Vencimientos</h2>
            <Link
              to="/organization/documents"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Ver documentos
            </Link>
          </div>
          <div className="space-y-4">
            {upcomingDeadlines.map((deadline) => (
              <div
                key={deadline.id}
                className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
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
                    {deadline.daysLeft} días restantes
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Acciones Rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/organization/documents"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-600 hover:bg-emerald-50 transition group"
          >
            <div className="w-10 h-10 bg-emerald-100 group-hover:bg-emerald-600 rounded-lg flex items-center justify-center transition">
              <FileText className="w-5 h-5 text-emerald-600 group-hover:text-white transition" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Subir Documento</p>
              <p className="text-xs text-gray-600">Cargar archivos requeridos</p>
            </div>
          </Link>

          <Link
            to="/organization/announcements"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-600 hover:bg-emerald-50 transition group"
          >
            <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-600 rounded-lg flex items-center justify-center transition">
              <Bell className="w-5 h-5 text-blue-600 group-hover:text-white transition" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Ver Avisos</p>
              <p className="text-xs text-gray-600">Comunicados importantes</p>
            </div>
          </Link>

          <Link
            to="/organization/messages"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-emerald-600 hover:bg-emerald-50 transition group"
          >
            <div className="w-10 h-10 bg-purple-100 group-hover:bg-purple-600 rounded-lg flex items-center justify-center transition">
              <MessageSquare className="w-5 h-5 text-purple-600 group-hover:text-white transition" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Mensajes</p>
              <p className="text-xs text-gray-600">Comunicación directa</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Compliance Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Estado de Cumplimiento</h2>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Documentación Completa</span>
              <span className="text-sm font-medium text-emerald-600">80%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '80%' }}></div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-900 mb-1">
                Atención Requerida
              </p>
              <p className="text-sm text-yellow-700">
                Tienes 3 documentos pendientes de entrega. Por favor, revisa la sección de documentos para mantener tu cumplimiento al día.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
