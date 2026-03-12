import { NextResponse } from 'next/server';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  content: string;
}

interface ChatPayload {
  message: string;
  history?: ChatMessage[];
  organizationName?: string;
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const MAX_HISTORY_MESSAGES = 12;

function isValidChatPayload(value: unknown): value is ChatPayload {
  if (!value || typeof value !== 'object') return false;

  const payload = value as Record<string, unknown>;

  return typeof payload.message === 'string' && payload.message.trim().length > 0;
}

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

function isLikelyLegalQuestion(message: string) {
  return /(ley|legal|regulacion|regulación|sat|lavado|dinero|norma|normativa|penal|delito|juridic|jurídic)/i.test(message);
}

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