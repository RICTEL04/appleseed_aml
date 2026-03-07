// components/Announcements.tsx
// Este componente es el principal para mostrar los avisos y comunicados, 
// incluye filtros por categoría, prioridad, estado de lectura y búsqueda por texto,
// además de la funcionalidad para marcar los avisos como leídos al seleccionarlos y 
// mostrar los detalles del aviso seleccionado.

"use client"
import { useEffect, useMemo, useState } from 'react';
import { Bell, AlertTriangle, Info, CheckCircle, Calendar, User, X, Search, SlidersHorizontal } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router';
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

type AnnouncementPriority = Announcement['priority'];
type AnnouncementCategory = Announcement['category'];

const categoryLabels: Record<AnnouncementCategory, string> = {
  donacion: 'Donación',
  alerta: 'Alerta',
  urgente: 'Urgente',
  general: 'General',
  documento: 'Documento',
};

const categoryStyles: Record<AnnouncementCategory, string> = {
  donacion: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  alerta: 'bg-amber-50 text-amber-700 border-amber-200',
  urgente: 'bg-rose-50 text-rose-700 border-rose-200',
  general: 'bg-slate-50 text-slate-700 border-slate-200',
  documento: 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

//componente principal para mostrar los avisos y comunicados, incluye filtros por categoría, 
//prioridad, estado de lectura y búsqueda por texto,
//además de la funcionalidad para marcar los avisos como leídos al seleccionarlos y mostrar los detalles del aviso seleccionado.
export function Announcements() {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading, error, announcements: fetchedAnnouncements, updateAnnouncement } = useAnnouncement();

  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | AnnouncementCategory>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | AnnouncementPriority>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const mapped: Announcement[] = useMemo(() => fetchedAnnouncements.map((a) => ({
    id: a.id_aviso,
    title: a.titulo,
    content: a.mensaje,
    date: a.fecha || new Date().toISOString(),
    author: a.remitente,
    priority: a.urgencia as 'baja' | 'media' | 'alta',
    category: a.categoria as 'donacion' | 'alerta' | 'urgente' | 'general' | 'documento',
    read: a.estado === 'leido',
  })), [fetchedAnnouncements]);

  const unreadCount = mapped.filter((a) => !a.read).length;

  const hasActiveFilters = filter !== 'all' || selectedCategory !== 'all' || selectedPriority !== 'all' || searchQuery.trim() !== '';

  const filteredAnnouncements = mapped
    .filter((a) => {
      const matchesRead = filter === 'all' || !a.read;
      const matchesCategory = selectedCategory === 'all' || a.category === selectedCategory;
      const matchesPriority = selectedPriority === 'all' || a.priority === selectedPriority;

      const query = searchQuery.trim().toLowerCase();
      const searchable = [
        a.title,
        a.content,
        a.author,
        categoryLabels[a.category],
      ]
        .join(' ')
        .toLowerCase();
      const matchesSearch = query === '' || searchable.includes(query);

      return matchesRead && matchesCategory && matchesPriority && matchesSearch;
    })
    .sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return sortBy === 'newest' ? bTime - aTime : aTime - bTime;
    });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const selectedId = params.get('aviso');

    if (!selectedId || mapped.length === 0) {
      return;
    }

    const target = mapped.find((announcement) => announcement.id === selectedId);
    if (!target) {
      return;
    }

    setSelectedAnnouncement((prev) => (prev?.id === target.id ? prev : target));

    if (!target.read) {
      const sourceModel = fetchedAnnouncements.find((announcement) => announcement.id_aviso === target.id);
      if (sourceModel) {
        void updateAnnouncement(new AnnouncementModel({
          ...sourceModel,
          estado: 'leido',
        }));
      }
    }

    params.delete('aviso');
    const cleanedSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: cleanedSearch ? `?${cleanedSearch}` : '',
      },
      { replace: true },
    );
  }, [location.pathname, location.search, mapped, fetchedAnnouncements, updateAnnouncement, navigate]);

  const handleSelect = async (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    if (!announcement.read) {
      const model = fetchedAnnouncements.find((a) => a.id_aviso === announcement.id);
      if (model) {
        await updateAnnouncement(new AnnouncementModel({ ...model, estado: 'leido' }));
      }
    }
  };

  const getPriorityIcon = (priority: AnnouncementPriority) => {
    switch (priority) {
      case 'alta':  return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'media': return <Info className="w-5 h-5 text-orange-600" />;
      default:      return <CheckCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getPriorityBadge = (priority: AnnouncementPriority) => {
    const styles: Record<AnnouncementPriority, string> = {
      alta:  'bg-red-100 text-red-700',
      media: 'bg-orange-100 text-orange-700',
      baja:  'bg-blue-100 text-blue-700',
    };
    const labels: Record<AnnouncementPriority, string> = {
      alta: 'Urgente', media: 'Importante', baja: 'Informativo',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const getCategoryBadge = (category: AnnouncementCategory) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${categoryStyles[category]}`}>
        {categoryLabels[category]}
      </span>
    );
  };

  const resetFilters = () => {
    setFilter('all');
    setSelectedCategory('all');
    setSelectedPriority('all');
    setSearchQuery('');
    setSortBy('newest');
  };

  if (loading) return <div className="text-center py-8">Cargando avisos...</div>;
  if (error)   return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Avisos y Comunicados</h1>
              <p className="text-sm sm:text-base text-gray-600">Información importante de Appleseed México</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                Total: {mapped.length}
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700">
                No leídos: {unreadCount}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-900">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <h2 className="text-xs font-semibold uppercase tracking-wide">Filtros</h2>
              </div>
              <span className="text-xs text-gray-600 font-medium">
                {filteredAnnouncements.length} resultado{filteredAnnouncements.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-2">
              <div className="xl:col-span-5">
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Título, contenido o remitente"
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="xl:col-span-2">
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Orden</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="newest">Recientes</option>
                  <option value="oldest">Antiguos</option>
                </select>
              </div>

              <div className="xl:col-span-2">
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Categoría</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as 'all' | AnnouncementCategory)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  <option value="all">Todas</option>
                  <option value="donacion">Donación</option>
                  <option value="alerta">Alerta</option>
                  <option value="urgente">Urgente</option>
                  <option value="documento">Documento</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className="xl:col-span-2">
                <label className="block text-[11px] font-medium text-gray-600 mb-0.5">Prioridad</label>
                <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value as 'all' | AnnouncementPriority)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  <option value="all">Todas</option>
                  <option value="alta">Urgente</option>
                  <option value="media">Importante</option>
                  <option value="baja">Informativo</option>
                </select>
              </div>

              <div className="xl:col-span-1 flex items-end">
                <button
                  onClick={resetFilters}
                  disabled={!hasActiveFilters}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Limpiar
                </button>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap">
              {(['all', 'unread'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-2.5 py-1 rounded-full border text-xs font-medium transition ${filter === f ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100'}`}>
                  {f === 'all' ? 'Todos' : 'No leídos'}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-1.5">
                {searchQuery.trim() && (
                  <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    Búsqueda: {searchQuery.trim()}
                  </span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                    Categoría: {categoryLabels[selectedCategory]}
                  </span>
                )}
                {selectedPriority !== 'all' && (
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                    Prioridad: {selectedPriority === 'alta' ? 'Urgente' : selectedPriority === 'media' ? 'Importante' : 'Informativo'}
                  </span>
                )}
                {filter === 'unread' && (
                  <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-700">
                    Estado: No leídos
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">

        <div className="xl:col-span-1 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 space-y-3">
          {filteredAnnouncements.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
              <Bell className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-900 mb-1">No hay avisos</h3>
              <p className="text-sm text-gray-500">No se encontraron avisos con los filtros seleccionados</p>
            </div>
          ) : (
            filteredAnnouncements.map((a) => (
              <div key={a.id} onClick={() => handleSelect(a)}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  selectedAnnouncement?.id === a.id ? 'border-emerald-600 bg-emerald-50 shadow-sm'
                  : a.read ? 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:shadow-sm'
                }`}>
                <div className="flex items-start gap-3 mb-3">
                  {getPriorityIcon(a.priority)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{a.title}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{a.content}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {new Date(a.date).toLocaleDateString('es-MX')}
                    </div>
                  </div>
                  {!a.read && <div className="w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0 mt-2" />}
                </div>
                <div className="flex items-center gap-2">
                  {getPriorityBadge(a.priority)}
                  {getCategoryBadge(a.category)}
                </div>
                <p className="text-xs text-gray-500 mt-2 truncate">{a.author}</p>
              </div>
            ))
          )}
        </div>

        <div className="xl:col-span-3 h-[calc(100vh-250px)]">
          {selectedAnnouncement ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sm:p-8 h-full flex flex-col">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-3 flex-1">
                  {getPriorityIcon(selectedAnnouncement.priority)}
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedAnnouncement.title}</h2>
                    <div className="flex flex-wrap items-center gap-3">
                      {getPriorityBadge(selectedAnnouncement.priority)}
                      {getCategoryBadge(selectedAnnouncement.category)}
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

              <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(selectedAnnouncement.date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                  <User className="w-4 h-4" />
                  {selectedAnnouncement.author}
                </div>
              </div>

              <div className="prose max-w-none flex-1 overflow-y-auto pr-1">
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
            <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center h-full flex flex-col items-center justify-center">
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