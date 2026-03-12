/**
 * @file organization-chat/route.ts
 * @description Next.js Route Handler para el chatbot AML del portal de organizaciones.
 *
 * Acepta peticiones POST con el mensaje del usuario y el historial de conversacion,
 * reenvía la solicitud a la API de OpenAI Responses y devuelve la respuesta generada.
 *
 * Si `OPENAI_API_KEY` no está configurada, devuelve respuestas locales de fallback
 * basadas en patrones de palabras clave (documentos, avisos, donaciones).
 *
 * Variables de entorno requeridas:
 * - `OPENAI_API_KEY`  — Clave de API de OpenAI.
 * - `OPENAI_MODEL`   — Modelo a usar (por defecto `gpt-4o-mini`).
 */

import { NextResponse } from 'next/server';

/** Roles válidos en la conversación del chatbot. */
type ChatRole = 'user' | 'assistant';

/** Un mensaje individual dentro del historial de conversación. */
interface ChatMessage {
  role: ChatRole;
  content: string;
}

/**
 * Payload esperado en el cuerpo de la petición POST.
 *
 * @property message          - Mensaje actual del usuario (requerido).
 * @property history          - Historial previo de la conversación (opcional, máx. últimos 12).
 * @property organizationName - Nombre de la organización activa, usado para personalizar el prompt.
 */
interface ChatPayload {
  message: string;
  history?: ChatMessage[];
  organizationName?: string;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
/** Cantidad máxima de mensajes del historial que se envían al modelo para limitar tokens. */
const MAX_HISTORY_MESSAGES = 12;

/**
 * Valida que el body recibido sea un `ChatPayload` mínimo válido.
 * Solo se exige que `message` sea un string no vacío; el resto de campos son opcionales.
 */
function isValidChatPayload(value: unknown): value is ChatPayload {
  if (!value || typeof value !== 'object') return false;

  const payload = value as Record<string, unknown>;

  return typeof payload.message === 'string' && payload.message.trim().length > 0;
}

/**
 * Limpia y recorta el historial de conversación antes de enviarlo al modelo.
 * - Descarta entradas con roles o contenido inválidos.
 * - Elimina espacios en blanco sobrantes de cada mensaje.
 * - Conserva únicamente los últimos `MAX_HISTORY_MESSAGES` turnos.
 */
function sanitizeHistory(history: ChatMessage[] | undefined): ChatMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item) => item && typeof item.content === 'string' && (item.role === 'user' || item.role === 'assistant'))
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }))
    .filter((item) => item.content.length > 0)
    .slice(-MAX_HISTORY_MESSAGES);
}

/**
 * Construye el prompt de sistema que define el rol y las reglas de comportamiento
 * del asistente AML.
 *
 * Restricciones clave incluidas en el prompt:
 * - Responde solo en español y con orientación general, no asesoría legal personalizada.
 * - Rechaza solicitudes para evadir controles AML/KYC o actividades ilícitas.
 * - No inventa leyes ni artículos; remite al equipo legal cuando no tiene certeza.
 * - Incluye descargo legal en respuestas con contenido jurídico.
 */
function buildSystemPrompt(organizationName: string | undefined) {
  const safeOrganizationName = organizationName?.trim() || 'la organización';

  return [
    'Eres un asistente virtual para Appleseed Mexico dentro de una plataforma AML.',
    `Atiendes a usuarios de ${safeOrganizationName}.`,
    'Objetivo: responder dudas sobre uso del portal, procesos internos, cumplimiento AML, documentos, donaciones y avisos.',
    'Reglas de respuesta:',
    '- Responde siempre en espanol claro y profesional.',
    '- Da orientacion general, no asesoria legal personalizada.',
    '- Si preguntan por estrategias para evadir controles AML/KYC o actividades ilegales, rechaza y explica que no puedes ayudar.',
    '- No inventes leyes ni articulos. Si no tienes certeza, dilo explicitamente y recomienda consultar al equipo legal/compliance.',
    '- Prioriza pasos accionables dentro del sitio, mencionando modulos: /organization/documents, /organization/announcements, /organization/donations, /organization/profile.',
    '- Cuando aplique, estructura en pasos numerados cortos.',
    '- Incluye un breve descargo: "Esta respuesta es orientativa y no sustituye asesoria legal profesional." cuando la pregunta sea legal.',
  ].join('\n');
}

/**
 * Heurística simple para detectar si el mensaje tiene contenido de naturaleza legal
 * y por tanto debe incluir el descargo de orientación no vinculante.
 */
function isLikelyLegalQuestion(message: string) {
  return /(ley|legal|regulacion|regulación|sat|lavado|dinero|norma|normativa|penal|delito|juridic|jurídic)/i.test(message);
}

/**
 * Genera una respuesta local cuando `OPENAI_API_KEY` no está disponible.
 * Usa patrones de palabras clave en el mensaje para devolver guías accionables
 * sobre los módulos del portal: documentos, avisos y donaciones.
 */
function buildFallbackReply(message: string) {
  const legalDisclaimer = isLikelyLegalQuestion(message)
    ? '\n\nEsta respuesta es orientativa y no sustituye asesoria legal profesional.'
    : '';

  if (/document|vencim|reporte/i.test(message)) {
    return `Para gestionar documentos en la plataforma:\n1. Entra a /organization/documents.\n2. Revisa estado (pendiente, en revision, aprobado o rechazado).\n3. Prioriza los que esten por vencer o atrasados.\n4. Si un documento fue rechazado, corrige y vuelve a cargar evidencia.${legalDisclaimer}`;
  }

  if (/aviso|notific|mensaje/i.test(message)) {
    return `Para revisar comunicaciones:\n1. Abre /organization/announcements.\n2. Filtra avisos no leidos y urgentes.\n3. Atiende primero los relacionados con cumplimiento y documentos.${legalDisclaimer}`;
  }

  if (/donaci|umbral|alerta/i.test(message)) {
    return `Para monitorear riesgo AML por donaciones:\n1. Revisa /organization/donations y el dashboard de organizacion.\n2. Verifica operaciones inusuales y montos acumulados.\n3. Si detectas alertas AML, documenta soporte y coordina con cumplimiento.${legalDisclaimer}`;
  }

  return `Puedo orientarte sobre procesos del portal AML: documentos, avisos, perfil y donaciones.\n\nSi me compartes tu duda concreta, te doy pasos puntuales para resolverla dentro de la plataforma.${legalDisclaimer}`;
}

/**
 * Extrae el texto de la respuesta del modelo desde la estructura de la API de OpenAI Responses.
 * Intenta primero `output_text` (campo de conveniencia) y, si no existe,
 * recorre `output[].content[]` buscando una parte de tipo `output_text`.
 */
function extractModelText(responseBody: unknown) {
  if (!responseBody || typeof responseBody !== 'object') return '';

  const data = responseBody as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        type?: string;
        text?: string;
      }>;
    }>;
  };

  if (typeof data.output_text === 'string' && data.output_text.trim().length > 0) {
    return data.output_text.trim();
  }

  const firstText = data.output
    ?.flatMap((item) => item.content ?? [])
    .find((part) => part.type === 'output_text' && typeof part.text === 'string')
    ?.text;

  return firstText?.trim() ?? '';
}

export const runtime = 'nodejs';

/**
 * POST /api/organization-chat
 *
 * Recibe el mensaje del usuario y el historial de conversación, llama a OpenAI
 * y devuelve la respuesta del asistente AML.
 *
 * @body `{ message: string, history?: ChatMessage[], organizationName?: string }`
 *
 * Respuestas:
 * - `200` `{ reply: string, source: 'llm' | 'fallback' }` — Respuesta generada correctamente.
 * - `400` `{ message: string }` — Payload inválido.
 * - `502` `{ message: string }` — Fallo en la llamada a OpenAI.
 * - `500` `{ message: string }` — Error inesperado del servidor.
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;

    if (!isValidChatPayload(payload)) {
      return NextResponse.json(
        { message: 'Debes enviar un mensaje valido para el asistente.' },
        { status: 400 },
      );
    }

    const cleanMessage = payload.message.trim();
    const history = sanitizeHistory(payload.history);

    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        reply: buildFallbackReply(cleanMessage),
        source: 'fallback',
      });
    }

    const input = [
      {
        role: 'system',
        content: buildSystemPrompt(payload.organizationName),
      },
      ...history.map((item) => ({
        role: item.role,
        content: item.content,
      })),
      {
        role: 'user',
        content: cleanMessage,
      },
    ];

    const aiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input,
        temperature: 0.2,
        max_output_tokens: 600,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return NextResponse.json(
        {
          message: `No se pudo generar respuesta del asistente: ${errorText}`,
        },
        { status: 502 },
      );
    }

    const responseBody = (await aiResponse.json()) as unknown;
    const reply = extractModelText(responseBody) || buildFallbackReply(cleanMessage);

    return NextResponse.json({ reply, source: 'llm' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado en el asistente.';
    return NextResponse.json({ message }, { status: 500 });
  }
}