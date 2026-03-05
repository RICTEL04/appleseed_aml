import { useEffect, useState } from 'react';
import { Bell, X, FileText, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAnnouncement } from '../hooks/useAnnouncement';
import { AnnouncementModel } from '@/lib/models/announcement.model';

interface OrganizationNotification {
  id: string;
  type: 'announcement' | 'donation' | 'document';
  title: string;
  description: string;
  amount?: string;
  documentType?: string;
  timestamp: string;
  read: boolean;
  source: AnnouncementModel;
}

export function OrganizationNotificationPanel() {
  const navigate = useNavigate();
  const { loading, error, announcements, updateAnnouncement } = useAnnouncement();
  const [showPanel, setShowPanel] = useState(false);
  const [filter, setFilter] = useState<'all' | 'announcement' | 'donation' | 'document'>('all');

  const notifications: OrganizationNotification[] = announcements.map((announcement) => {
    const category = (announcement.categoria || '').toLowerCase();
    const type: OrganizationNotification['type'] = category === 'donacion'
      ? 'donation'
      : category === 'documento'
        ? 'document'
        : 'announcement';

    return {
      id: announcement.id_aviso,
      type,
      title: announcement.titulo,
      description: announcement.mensaje,
      timestamp: announcement.fecha || new Date().toISOString(),
      read: announcement.estado === 'leido',
      documentType: type === 'document' ? 'Documento de cumplimiento' : undefined,
      source: announcement,
    };
  });

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markAsRead = async (id: string) => {
    const target = notifications.find((notification) => notification.id === id);

    if (!target || target.read) {
      return;
    }

    await updateAnnouncement(new AnnouncementModel({
      ...target.source,
      estado: 'leido',
    }));
  };

  const handleNotificationClick = async (id: string) => {
    await markAsRead(id);
    setShowPanel(false);
    navigate(`/organization/announcements?aviso=${encodeURIComponent(id)}`);
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter((notification) => !notification.read);

    await Promise.all(
      unreadNotifications.map((notification) => updateAnnouncement(new AnnouncementModel({
        ...notification.source,
        estado: 'leido',
      }))),
    );
  };

  const filteredNotifications = notifications.filter((notification) => (
    filter === 'all' || notification.type === filter
  ));

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} min`;
    }

    if (diffInMinutes < 1440) {
      return `Hace ${Math.floor(diffInMinutes / 60)} h`;
    }

    return `Hace ${Math.floor(diffInMinutes / 1440)} d`;
  };

  useEffect(() => {
    if (!showPanel) {
      setFilter('all');
    }
  }, [showPanel]);

  return (
    <>
      <button
        onClick={() => setShowPanel((prev) => !prev)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
        aria-label="Abrir panel de notificaciones"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />

          <div className="absolute top-16 sm:top-[72px] right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[calc(100vh-6rem)] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Notificaciones</h3>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                  aria-label="Cerrar panel de notificaciones"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === 'all' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilter('announcement')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === 'announcement' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Avisos
                </button>
                <button
                  onClick={() => setFilter('donation')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === 'donation' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Donaciones
                </button>
                <button
                  onClick={() => setFilter('document')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === 'document' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Documentos
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium mt-3"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-gray-600">Cargando notificaciones...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              ) : filteredNotifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => {
                    const isDocumentRejected = notification.type === 'document' && notification.title.toLowerCase().includes('rechazado');

                    return (
                      <div
                        key={notification.id}
                        onClick={() => void handleNotificationClick(notification.id)}
                        className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                          !notification.read ? 'bg-emerald-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            notification.type === 'donation'
                              ? 'bg-green-100'
                              : notification.type === 'announcement'
                                ? 'bg-amber-100'
                                : isDocumentRejected
                                  ? 'bg-red-100'
                                  : 'bg-blue-100'
                          }`}>
                            {notification.type === 'donation' ? (
                              <DollarSign className="w-5 h-5 text-green-600" />
                            ) : notification.type === 'announcement' ? (
                              <AlertTriangle className="w-5 h-5 text-amber-600" />
                            ) : isDocumentRejected ? (
                              <AlertTriangle className="w-5 h-5 text-red-600" />
                            ) : (
                              <FileText className="w-5 h-5 text-blue-600" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <h4 className="text-sm font-semibold text-gray-900">{notification.title}</h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0 mt-1.5" />
                              )}
                            </div>

                            <p className="text-xs text-gray-600 mb-2">{notification.description}</p>

                            {notification.amount && (
                              <p className="text-sm font-medium text-green-600 mb-1">{notification.amount}</p>
                            )}

                            {notification.documentType && (
                              <p className="text-sm text-gray-700 mb-1">{notification.documentType}</p>
                            )}

                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {getTimeAgo(notification.timestamp)}
                              {notification.read && (
                                <>
                                  <span>•</span>
                                  <CheckCircle className="w-3 h-3" />
                                  Leída
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">No hay notificaciones</p>
                </div>
              )}
            </div>

            {filteredNotifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">
                  {filteredNotifications.length} notificación(es)
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
