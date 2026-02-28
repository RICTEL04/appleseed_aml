"use client"
import { useState } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, Calendar, User } from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  date: string;
  author: string;
  priority: 'high' | 'medium' | 'low';
  category: 'regulation' | 'deadline' | 'general' | 'compliance';
  read: boolean;
}

const mockAnnouncements: Announcement[] = [
  {
    id: 1,
    title: 'Actualización de Políticas AML 2026',
    content: 'Se han implementado nuevas regulaciones para la prevención de lavado de dinero efectivas a partir del 1 de marzo de 2026. Todas las organizaciones deben revisar y actualizar sus procedimientos internos de acuerdo con las nuevas directrices. Se requiere capacitación obligatoria para el personal clave antes del 15 de marzo.',
    date: '2026-02-18',
    author: 'María González - Directora de Cumplimiento',
    priority: 'high',
    category: 'regulation',
    read: false,
  },
  {
    id: 2,
    title: 'Fecha límite para documentos Q1 2026',
    content: 'Recordatorio importante: Los documentos del primer trimestre 2026 deben ser entregados antes del 28 de febrero. Esto incluye reportes financieros, estados de cuenta, y certificados de donaciones. El incumplimiento puede resultar en sanciones administrativas.',
    date: '2026-02-15',
    author: 'Carlos Ramírez - Supervisor AML',
    priority: 'medium',
    category: 'deadline',
    read: false,
  },
  {
    id: 3,
    title: 'Nueva plataforma de capacitación disponible',
    content: 'Nos complace anunciar que ya está disponible nuestra nueva plataforma de capacitación en línea sobre prevención de lavado de dinero. Todos los miembros de organizaciones registradas tienen acceso gratuito. Los cursos incluyen certificación oficial.',
    date: '2026-02-10',
    author: 'Ana Martínez - Coordinadora de Capacitación',
    priority: 'low',
    category: 'general',
    read: true,
  },
  {
    id: 4,
    title: 'Cambios en el proceso de verificación',
    content: 'A partir del 1 de marzo, el proceso de verificación de organizaciones incluirá nuevos requisitos de documentación. Se requerirá información adicional sobre beneficiarios finales y fuentes de financiamiento. Por favor, preparen la documentación con anticipación.',
    date: '2026-02-08',
    author: 'Roberto Torres - Jefe de Verificación',
    priority: 'high',
    category: 'compliance',
    read: true,
  },
  {
    id: 5,
    title: 'Mantenimiento programado del sistema',
    content: 'El sistema estará en mantenimiento el sábado 24 de febrero de 2:00 AM a 6:00 AM. Durante este tiempo, no será posible acceder al portal ni subir documentos. Por favor, planifiquen sus actividades en consecuencia.',
    date: '2026-02-05',
    author: 'Equipo de Tecnología',
    priority: 'medium',
    category: 'general',
    read: true,
  },
  {
    id: 6,
    title: 'Actualización sobre operaciones sospechosas',
    content: 'Se ha actualizado la guía para la identificación y reporte de operaciones sospechosas. Todos los responsables de cumplimiento deben revisar el documento actualizado disponible en la sección de recursos. Se incluyen nuevos indicadores de riesgo y procedimientos de reporte.',
    date: '2026-02-01',
    author: 'María González - Directora de Cumplimiento',
    priority: 'high',
    category: 'regulation',
    read: true,
  },
];

export function Announcements() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const filteredAnnouncements = mockAnnouncements.filter((announcement) => {
    const matchesReadFilter = filter === 'all' || !announcement.read;
    const matchesCategory = selectedCategory === 'all' || announcement.category === selectedCategory;
    return matchesReadFilter && matchesCategory;
  });

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'medium':
        return <Info className="w-5 h-5 text-orange-600" />;
      default:
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const classes = {
      high: 'bg-red-100 text-red-700',
      medium: 'bg-orange-100 text-orange-700',
      low: 'bg-blue-100 text-blue-700',
    }[priority];

    const labels = {
      high: 'Urgente',
      medium: 'Importante',
      low: 'Informativo',
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${classes}`}>
        {labels[priority as keyof typeof labels]}
      </span>
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels = {
      regulation: 'Regulación',
      deadline: 'Fecha Límite',
      general: 'General',
      compliance: 'Cumplimiento',
    };
    return labels[category as keyof typeof labels];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Avisos y Comunicados</h1>
        <p className="text-gray-600">Información importante de Appleseed México</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                filter === 'unread'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              No leídos
            </button>
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
          >
            <option value="all">Todas las categorías</option>
            <option value="regulation">Regulación</option>
            <option value="deadline">Fecha Límite</option>
            <option value="compliance">Cumplimiento</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* List */}
        <div className="lg:col-span-1 space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <div
              key={announcement.id}
              onClick={() => setSelectedAnnouncement(announcement)}
              className={`bg-white rounded-xl shadow-sm border-2 p-4 cursor-pointer transition ${
                selectedAnnouncement?.id === announcement.id
                  ? 'border-emerald-600'
                  : announcement.read
                  ? 'border-gray-200 hover:border-gray-300'
                  : 'border-emerald-200 hover:border-emerald-300 bg-emerald-50'
              }`}
            >
              <div className="flex items-start gap-3 mb-3">
                {getPriorityIcon(announcement.priority)}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                    {announcement.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    {new Date(announcement.date).toLocaleDateString('es-MX')}
                  </div>
                </div>
                {!announcement.read && (
                  <div className="w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0 mt-2"></div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {getPriorityBadge(announcement.priority)}
                <span className="text-xs text-gray-600">
                  {getCategoryLabel(announcement.category)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Detail View */}
        <div className="lg:col-span-2">
          {selectedAnnouncement ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              <div className="mb-6">
                <div className="flex items-start gap-3 mb-4">
                  {getPriorityIcon(selectedAnnouncement.priority)}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedAnnouncement.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3">
                      {getPriorityBadge(selectedAnnouncement.priority)}
                      <span className="text-sm text-gray-600">
                        {getCategoryLabel(selectedAnnouncement.category)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedAnnouncement.date).toLocaleDateString('es-MX', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  {selectedAnnouncement.author}
                </div>
              </div>

              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                  {selectedAnnouncement.content}
                </p>
              </div>

              {selectedAnnouncement.priority === 'high' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900 mb-1">
                        Acción Requerida
                      </p>
                      <p className="text-sm text-red-700">
                        Este aviso requiere su atención inmediata. Por favor, tome las acciones necesarias lo antes posible.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Selecciona un aviso
              </h3>
              <p className="text-gray-600">
                Haz clic en cualquier aviso de la lista para ver los detalles completos
              </p>
            </div>
          )}
        </div>
      </div>

      {filteredAnnouncements.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay avisos</h3>
          <p className="text-gray-600">No se encontraron avisos con los filtros seleccionados</p>
        </div>
      )}
    </div>
  );
}
