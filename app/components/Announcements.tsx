"use client"
import { useState } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, Calendar, User, X } from 'lucide-react';
import { useAnnouncement } from '../hooks/useAnnouncement';
import { AnnouncementModel } from '@/lib/models/announcement.model';

interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  priority: 'baja' | 'media' | 'alta';
  category: 'donacion' | 'alerta' | 'urgente' | 'general' | 'documento';
  read: boolean;
}

export function Announcements() {
  const { loading, error, announcements: fetchedAnnouncements, updateAnnouncement } = useAnnouncement();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const mapped: Announcement[] = fetchedAnnouncements.map((a) => ({
    id: a.id_aviso,
    title: a.titulo,
    content: a.mensaje,
    date: a.fecha || new Date().toISOString(),
    author: a.remitente,
    priority: a.urgencia as 'baja' | 'media' | 'alta',
    category: a.categoria as 'donacion' | 'alerta' | 'urgente' | 'general' | 'documento',
    read: a.estado === 'leido',
  }));

  const filteredAnnouncements = mapped.filter((a) => {
    const matchesRead = filter === 'all' || !a.read;
    const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
    return matchesRead && matchesCategory;
  });

  const handleSelect = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    if (!announcement.read) {
      const model = fetchedAnnouncements.find((a) => a.id_aviso === announcement.id);
      if (model) {
        await updateAnnouncement(new AnnouncementModel({ ...model, estado: 'leido' }));
      }
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'alta':  return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'media': return <Info className="w-5 h-5 text-orange-600" />;
      default:      return <CheckCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      alta:  'bg-red-100 text-red-700',
      media: 'bg-orange-100 text-orange-700',
      baja:  'bg-blue-100 text-blue-700',
    };
    const labels: Record<string, string> = {
      alta: 'Urgente', media: 'Importante', baja: 'Informativo',
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${styles[priority] ?? styles.baja}`}>
        {labels[priority] ?? 'Informativo'}
      </span>
    );
  };

  if (loading) return <div className="text-center py-8">Cargando avisos...</div>;
  if (error)   return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Avisos y Comunicados</h1>
        <p className="text-gray-600">Información importante de Appleseed México</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex gap-2">
            {(['all', 'unread'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition ${filter === f ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                {f === 'all' ? 'Todos' : 'No leídos'}
              </button>
            ))}
          </div>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
            <option value="all">Todas las categorías</option>
            <option value="donacion">Donación</option>
            <option value="alerta">Alerta</option>
            <option value="urgente">Urgente</option>
            <option value="documento">Documento</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {/* List + Detail — both same height, both scroll independently */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── List ── */}
        <div className="lg:col-span-1 overflow-y-auto max-h-[calc(100vh-280px)] pr-1 space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
              <Bell className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">No hay avisos</h3>
              <p className="text-sm text-gray-500">No se encontraron avisos con los filtros seleccionados</p>
            </div>
          ) : (
            filteredAnnouncements.map((a) => (
              <div key={a.id} onClick={() => handleSelect(a)}
                className={`bg-white rounded-xl shadow-sm border-2 p-4 cursor-pointer transition ${
                  selectedAnnouncement?.id === a.id ? 'border-emerald-600'
                  : a.read ? 'border-gray-200 hover:border-gray-300'
                  : 'border-emerald-200 hover:border-emerald-300 bg-emerald-50'
                }`}>
                <div className="flex items-start gap-3 mb-3">
                  {getPriorityIcon(a.priority)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{a.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(a.date).toLocaleDateString('es-MX')}
                    </div>
                  </div>
                  {!a.read && <div className="w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0 mt-2" />}
                </div>
                <div className="flex items-center gap-2">
                  {getPriorityBadge(a.priority)}
                  <span className="text-xs text-gray-600">{a.category}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Detail ── */}
        <div className="lg:col-span-2 overflow-y-auto max-h-[calc(100vh-280px)]">
          {selectedAnnouncement ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8">
              {/* Close button */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-3 flex-1">
                  {getPriorityIcon(selectedAnnouncement.priority)}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedAnnouncement.title}</h2>
                    <div className="flex flex-wrap items-center gap-3">
                      {getPriorityBadge(selectedAnnouncement.priority)}
                      <span className="text-sm text-gray-600">{selectedAnnouncement.category}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="ml-4 w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedAnnouncement.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  {selectedAnnouncement.author}
                </div>
              </div>

              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed whitespace-pre-line">{selectedAnnouncement.content}</p>
              </div>

              {selectedAnnouncement.priority === 'alta' && (
                <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-900 mb-1">Acción Requerida</p>
                      <p className="text-sm text-red-700">Este aviso requiere su atención inmediata. Por favor, tome las acciones necesarias lo antes posible.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecciona un aviso</h3>
              <p className="text-gray-600">Haz clic en cualquier aviso de la lista para ver los detalles completos</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}