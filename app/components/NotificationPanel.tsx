import { useState, useEffect } from 'react';
import { Bell, X, FileText, DollarSign, CheckCircle, Clock } from 'lucide-react';

interface Notification {
  id: number;
  type: 'donation' | 'document';
  title: string;
  description: string;
  organizationName: string;
  amount?: string;
  documentType?: string;
  timestamp: string;
  read: boolean;
}

// Mock notifications database
const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'donation',
    title: 'Nueva Donación Recibida',
    description: 'Se ha registrado una donación exitosa',
    organizationName: 'Fundación Esperanza',
    amount: '$5,000 MXN',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min ago
    read: false,
  },
  {
    id: 2,
    type: 'document',
    title: 'Documento Legal Subido',
    description: 'Se ha subido un nuevo documento para revisión',
    organizationName: 'ONG Educación Global',
    documentType: 'Reporte Trimestral Q1 2026',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45 min ago
    read: false,
  },
  {
    id: 3,
    type: 'donation',
    title: 'Nueva Donación Recibida',
    description: 'Se ha registrado una donación exitosa',
    organizationName: 'Asociación Salud para Todos',
    amount: '$1,500 MXN',
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), // 1.5 hours ago
    read: false,
  },
  {
    id: 4,
    type: 'document',
    title: 'Documento Legal Subido',
    description: 'Se ha subido un nuevo documento para revisión',
    organizationName: 'Fundación Esperanza',
    documentType: 'Estados Financieros Enero',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    read: true,
  },
  {
    id: 5,
    type: 'donation',
    title: 'Nueva Donación Recibida',
    description: 'Se ha registrado una donación exitosa',
    organizationName: 'Centro de Apoyo Comunitario',
    amount: '$2,000 MXN',
    timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), // 3 hours ago
    read: true,
  },
];

export function NotificationPanel() {
  const [showPanel, setShowPanel] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'donation' | 'document'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: number) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' || n.type === filter
  );

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} min`;
    } else if (diffInMinutes < 1440) {
      return `Hace ${Math.floor(diffInMinutes / 60)} h`;
    } else {
      return `Hace ${Math.floor(diffInMinutes / 1440)} d`;
    }
  };

  // Simulate real-time notifications
  useEffect(() => {
    const interval = setInterval(() => {
      // Randomly add a new notification (10% chance every 30 seconds)
      if (Math.random() < 0.1) {
        const types: ('donation' | 'document')[] = ['donation', 'document'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        const orgNames = ['Fundación Esperanza', 'ONG Educación Global', 'Asociación Salud para Todos'];
        const randomOrg = orgNames[Math.floor(Math.random() * orgNames.length)];

        const newNotification: Notification = {
          id: Date.now(),
          type: randomType,
          title: randomType === 'donation' ? 'Nueva Donación Recibida' : 'Documento Legal Subido',
          description: randomType === 'donation' 
            ? 'Se ha registrado una donación exitosa' 
            : 'Se ha subido un nuevo documento para revisión',
          organizationName: randomOrg,
          amount: randomType === 'donation' ? `$${Math.floor(Math.random() * 5000) + 500} MXN` : undefined,
          documentType: randomType === 'document' ? 'Documento de Cumplimiento' : undefined,
          timestamp: new Date().toISOString(),
          read: false,
        };

        setNotifications(prev => [newNotification, ...prev]);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Notification Bell Button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {showPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setShowPanel(false)}
          />

          {/* Panel */}
          <div className="absolute top-16 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[calc(100vh-5rem)] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Notificaciones</h3>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === 'all'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setFilter('donation')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === 'donation'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Donaciones
                </button>
                <button
                  onClick={() => setFilter('document')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    filter === 'document'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      onClick={() => markAsRead(notification.id)}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                        !notification.read ? 'bg-emerald-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          notification.type === 'donation'
                            ? 'bg-green-100'
                            : 'bg-blue-100'
                        }`}>
                          {notification.type === 'donation' ? (
                            <DollarSign className="w-5 h-5 text-green-600" />
                          ) : (
                            <FileText className="w-5 h-5 text-blue-600" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1">
                            <h4 className="text-sm font-semibold text-gray-900">
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0 mt-1.5"></div>
                            )}
                          </div>

                          <p className="text-xs text-gray-600 mb-2">
                            {notification.organizationName}
                          </p>

                          {notification.amount && (
                            <p className="text-sm font-medium text-green-600 mb-1">
                              {notification.amount}
                            </p>
                          )}

                          {notification.documentType && (
                            <p className="text-sm text-gray-700 mb-1">
                              {notification.documentType}
                            </p>
                          )}

                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {getTimeAgo(notification.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-sm text-gray-600">No hay notificaciones</p>
                </div>
              )}
            </div>

            {/* Footer */}
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
