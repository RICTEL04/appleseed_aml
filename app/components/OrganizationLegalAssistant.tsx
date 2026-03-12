/**
 * @file OrganizationLegalAssistant.tsx
 * @description Widget flotante de chatbot AML para el portal de organizaciones.
 *
 * Renderiza un botón fijo en la esquina inferior derecha de la pantalla que,
 * al activarse, despliega una ventana de conversación con el asistente virtual.
 * Las consultas se envían a `POST /api/organization-chat` y el historial se
 * mantiene en estado local durante la sesión activa.
 *
 * Se monta en `OrganizationLayout` para que esté disponible en todas las rutas
 * del portal de organizaciones (`/organization/*`).
 */

"use client";

import { FormEvent, useMemo, useState } from 'react';
import { Bot, Loader2, MessageCircle, Send, X } from 'lucide-react';

/** Roles válidos en la conversación del chatbot (espejo del tipo del API). */
type ChatRole = 'user' | 'assistant';

/** Representa un turno individual dentro del historial de conversación. */
interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Mensaje de bienvenida mostrado al abrir el chat por primera vez. */
const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    'Hola. Soy tu asistente AML de Appleseed Mexico. Te puedo orientar sobre documentos, donaciones, avisos y procedimientos del portal.',
};

/**
 * Widget de chatbot flotante para el asistente AML de Appleseed Mexico.
 *
 * Comportamiento:
 * - Botón flotante siempre visible en la esquina inferior derecha.
 * - Al hacer clic se despliega/oculta la ventana de conversación.
 * - Envía el mensaje y los últimos 10 turnos de historial al endpoint de chat.
 * - Muestra indicador de carga y errores en línea.
 * - El nombre de la organización se lee de `localStorage` para personalizar el prompt.
 */
export function OrganizationLegalAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE]);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /** Nombre de la organización activa leído de localStorage para personalizar el prompt del modelo. */
  const organizationName = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return localStorage.getItem('organization_name') ?? '';
  }, []);

  /**
   * Maneja el envío del formulario de chat.
   * Agrega el mensaje del usuario al historial local, llama al endpoint
   * y agrega la respuesta del asistente al estado al recibir la respuesta.
   */
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const message = inputValue.trim();
    if (!message || isSending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInputValue('');
    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/organization-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          organizationName,
          history: nextMessages.slice(-10),
        }),
      });

      const data = (await response.json()) as { reply?: string; message?: string };

      if (!response.ok) {
        throw new Error(data.message ?? 'No se pudo contactar al asistente.');
      }

      const assistantReply = (data.reply ?? '').trim() || 'No pude generar una respuesta en este momento.';

      setMessages((previous) => [
        ...previous,
        {
          role: 'assistant',
          content: assistantReply,
        },
      ]);
    } catch (error) {
      const messageText = error instanceof Error ? error.message : 'Error inesperado en el chat.';
      setErrorMessage(messageText);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {isOpen && (
        <section className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[430px] max-h-[70vh] bg-white border border-emerald-100 shadow-2xl rounded-2xl z-50 overflow-hidden">
          <header className="flex items-start justify-between gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Asistente AML</p>
              <p className="text-[11px] text-emerald-100">Orientacion legal general y procedimientos del portal</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-md hover:bg-white/15 transition"
              aria-label="Cerrar chat"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div className="h-[360px] overflow-y-auto bg-emerald-50/30 p-4 space-y-3">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  item.role === 'assistant'
                    ? 'bg-white border border-emerald-100 text-gray-800'
                    : 'ml-auto bg-emerald-600 text-white'
                }`}
              >
                {item.content}
              </div>
            ))}

            {isSending && (
              <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-white px-3 py-2 text-sm text-gray-700">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analizando tu consulta...
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 p-3">
            {errorMessage && (
              <p className="mb-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {errorMessage}
              </p>
            )}

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Ej. Que documento necesito para el SAT?"
                className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                maxLength={800}
              />
              <button
                type="submit"
                disabled={isSending || inputValue.trim().length === 0}
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-white disabled:opacity-60"
                aria-label="Enviar mensaje"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <p className="mt-2 text-[11px] text-gray-500">
              Respuestas orientativas. Para casos sensibles, valida con el area legal/compliance.
            </p>
          </div>
        </section>
      )}

      <button
        onClick={() => setIsOpen((previous) => !previous)}
        className="fixed bottom-5 right-4 sm:right-6 z-50 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-3 text-white shadow-xl hover:bg-emerald-700 transition"
        aria-label={isOpen ? 'Ocultar asistente AML' : 'Abrir asistente AML'}
      >
        {isOpen ? <X className="w-4 h-4" /> : <MessageCircle className="w-4 h-4" />}
        <span className="text-sm font-medium">Asistente AML</span>
        <Bot className="w-4 h-4" />
      </button>
    </>
  );
}