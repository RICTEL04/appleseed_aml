"use client"

import { useState } from 'react';
import { Send, Paperclip, User, Search } from 'lucide-react';

interface Message {
  id: number;
  sender: 'org' | 'appleseed';
  senderName: string;
  content: string;
  timestamp: string;
  avatar?: string;
}

interface Conversation {
  id: number;
  subject: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: boolean;
  status: 'open' | 'resolved';
  appleseedContact: string;
}

const mockConversations: Conversation[] = [
  {
    id: 1,
    subject: 'Consulta sobre documentos Q1',
    lastMessage: 'Gracias por la información, procederemos con la revisión.',
    lastMessageTime: '2026-02-19T14:30:00',
    unread: true,
    status: 'open',
    appleseedContact: 'María González',
  },
  {
    id: 2,
    subject: 'Actualización de datos organizacionales',
    lastMessage: 'Los cambios han sido aprobados exitosamente.',
    lastMessageTime: '2026-02-18T10:15:00',
    unread: false,
    status: 'resolved',
    appleseedContact: 'Carlos Ramírez',
  },
  {
    id: 3,
    subject: 'Capacitación AML - Solicitud de fecha',
    lastMessage: '¿Podrían confirmar su disponibilidad para el 25 de febrero?',
    lastMessageTime: '2026-02-17T16:45:00',
    unread: false,
    status: 'open',
    appleseedContact: 'Ana Martínez',
  },
];

const mockMessages: { [key: number]: Message[] } = {
  1: [
    {
      id: 1,
      sender: 'org',
      senderName: 'Fundación Esperanza',
      content: 'Buenos días, tenemos dudas sobre los documentos requeridos para el Q1. ¿Podrían especificar qué formato debe tener el reporte financiero?',
      timestamp: '2026-02-19T09:00:00',
    },
    {
      id: 2,
      sender: 'appleseed',
      senderName: 'María González',
      content: 'Buenos días. El reporte financiero debe incluir: balance general, estado de resultados, y flujo de efectivo. Puede ser en formato PDF o Excel. También debe estar firmado digitalmente por el representante legal.',
      timestamp: '2026-02-19T10:30:00',
    },
    {
      id: 3,
      sender: 'org',
      senderName: 'Fundación Esperanza',
      content: '¿Es necesario incluir las notas a los estados financieros?',
      timestamp: '2026-02-19T11:00:00',
    },
    {
      id: 4,
      sender: 'appleseed',
      senderName: 'María González',
      content: 'Sí, las notas son obligatorias. Deben explicar las políticas contables principales y cualquier movimiento significativo del periodo.',
      timestamp: '2026-02-19T11:15:00',
    },
    {
      id: 5,
      sender: 'org',
      senderName: 'Fundación Esperanza',
      content: 'Perfecto, muchas gracias por la aclaración.',
      timestamp: '2026-02-19T14:00:00',
    },
    {
      id: 6,
      sender: 'appleseed',
      senderName: 'María González',
      content: 'Gracias por la información, procederemos con la revisión.',
      timestamp: '2026-02-19T14:30:00',
    },
  ],
};

export function Messages() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConversations = mockConversations.filter((conv) =>
    conv.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentMessages = selectedConversation ? mockMessages[selectedConversation] || [] : [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && selectedConversation) {
      // Mock sending message
      setNewMessage('');
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date('2026-02-20');
    const yesterday = new Date('2026-02-19');

    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mensajes</h1>
        <p className="text-gray-600">Comunicación directa con el equipo de Appleseed</p>
      </div>

      {/* Messages Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
          {/* Conversations List */}
          <div className="lg:col-span-1 border-r border-gray-200 flex flex-col h-full">
            {/* Search */}
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar conversaciones..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none text-sm"
                />
              </div>
            </div>

            {/* Conversations */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv.id)}
                  className={`p-4 border-b border-gray-100 cursor-pointer transition ${
                    selectedConversation === conv.id
                      ? 'bg-emerald-50 border-l-4 border-l-emerald-600'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className={`font-semibold text-sm ${
                      conv.unread ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {conv.subject}
                    </h3>
                    {conv.unread && (
                      <div className="w-2 h-2 bg-emerald-600 rounded-full flex-shrink-0 mt-1.5"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    Con: {conv.appleseedContact}
                  </p>
                  <p className={`text-sm mb-2 line-clamp-2 ${
                    conv.unread ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                    {conv.lastMessage}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {formatTime(conv.lastMessageTime)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      conv.status === 'open'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {conv.status === 'open' ? 'Abierto' : 'Resuelto'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Thread */}
          <div className="lg:col-span-2 flex flex-col h-full">
            {selectedConversation ? (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900 mb-1">
                    {mockConversations.find(c => c.id === selectedConversation)?.subject}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Con: {mockConversations.find(c => c.id === selectedConversation)?.appleseedContact}
                  </p>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {currentMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.sender === 'org' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.sender === 'org' ? 'bg-emerald-600' : 'bg-blue-600'
                      }`}>
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className={`flex-1 max-w-md ${
                        message.sender === 'org' ? 'items-end' : 'items-start'
                      }`}>
                        <p className="text-xs text-gray-600 mb-1">
                          {message.senderName}
                        </p>
                        <div className={`p-3 rounded-lg ${
                          message.sender === 'org'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(message.timestamp).toLocaleTimeString('es-MX', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      <span className="hidden sm:inline">Enviar</span>
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full p-8 text-center">
                <div>
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Selecciona una conversación
                  </h3>
                  <p className="text-gray-600">
                    Elige una conversación de la lista para ver los mensajes
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
