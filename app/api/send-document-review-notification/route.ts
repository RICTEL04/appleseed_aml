import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface DocumentReviewNotificationPayload {
  organizationId: string;
  documentName: string;
  status: 'aprobado' | 'rechazado';
  reviewerName: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;
const appSchema = process.env.NEXT_PUBLIC_SUPABASE_APP_SCHEMA ?? 'public';
const resendApiKey = process.env.RESEND_API_KEY;
const senderEmail =
  process.env.DOCUMENT_REVIEW_FROM_EMAIL ??
  process.env.DONATIONS_FROM_EMAIL ??
  'notificaciones@appleseed.mx';
const SAT_DONOR_REPORT_NAME = 'Reporte donador al SAT';

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY).',
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isValidPayload(value: unknown): value is DocumentReviewNotificationPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.organizationId === 'string' &&
    payload.organizationId.trim().length > 0 &&
    typeof payload.documentName === 'string' &&
    payload.documentName.trim().length > 0 &&
    typeof payload.reviewerName === 'string' &&
    payload.reviewerName.trim().length > 0 &&
    typeof payload.status === 'string' &&
    ['aprobado', 'rechazado'].includes(payload.status)
  );
}

async function sendEmailWithResend({
  recipient,
  organizationName,
  documentName,
  status,
  reviewerName,
}: {
  recipient: string;
  organizationName: string;
  documentName: string;
  status: 'aprobado' | 'rechazado';
  reviewerName: string;
}) {
  if (!resendApiKey) {
    throw new Error('Falta configurar RESEND_API_KEY para enviar correos.');
  }

  const normalizedStatus = status === 'aprobado' ? 'aprobado' : 'rechazado';
  const subject =
    normalizedStatus === 'aprobado'
      ? `Documento aprobado: ${documentName}`
      : `Documento rechazado: ${documentName}`;

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 16px 0;">Actualización de documento</h2>
      <p>Hola ${organizationName},</p>
      <p>
        Tu documento <strong>${documentName}</strong> fue <strong>${normalizedStatus}</strong>.
      </p>
      <p>
        Esta revisión fue realizada por: <strong>${reviewerName}</strong>.
      </p>
      <p>Ingresa al portal para ver más detalles.</p>
      <p>Appleseed México</p>
    </div>
  `;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: senderEmail,
      to: [recipient],
      subject,
      html: emailHtml,
    }),
  });

  if (!resendResponse.ok) {
    const responseText = await resendResponse.text();
    throw new Error(`No se pudo enviar el correo: ${responseText}`);
  }
}

async function recalculateOrganizationRisk(
  supabaseAdmin: ReturnType<typeof getAdminClient>,
  organizationId: string,
) {
  const { data: unapprovedSatDocs, error: unapprovedDocsError } = await supabaseAdmin
    .schema(appSchema)
    .from('documentos')
    .select('id')
    .eq('id_osc', organizationId)
    .eq('nombre_documento', SAT_DONOR_REPORT_NAME)
    .or('estado.is.null,estado.neq.aprobado')
    .limit(1);

  if (unapprovedDocsError) {
    throw new Error(`No se pudo validar documentos pendientes para riesgo: ${unapprovedDocsError.message}`);
  }

  let riskLevel: 'alto' | 'medio' | 'bajo' = 'bajo';

  if ((unapprovedSatDocs ?? []).length > 0) {
    riskLevel = 'alto';
  } else {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: thresholdOneAlerts, error: alertsError } = await supabaseAdmin
      .schema(appSchema)
      .from('alertas_aml')
      .select('id')
      .eq('id_osc', organizationId)
      .eq('umbral', 1)
      .gte('created_at', sixMonthsAgo.toISOString())
      .limit(1);

    if (alertsError) {
      throw new Error(`No se pudo validar alertas AML para riesgo: ${alertsError.message}`);
    }

    if ((thresholdOneAlerts ?? []).length > 0) {
      riskLevel = 'medio';
    }
  }

  const { error: riskUpdateError } = await supabaseAdmin
    .schema(appSchema)
    .from('osc')
    .update({ riesgo: riskLevel })
    .eq('id_osc', organizationId);

  if (riskUpdateError) {
    throw new Error(`No se pudo actualizar riesgo en osc: ${riskUpdateError.message}`);
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        { message: 'Datos incompletos para notificación de revisión de documento.' },
        { status: 400 },
      );
    }

    const supabaseAdmin = getAdminClient();

    const { data: organization, error: organizationError } = await supabaseAdmin
      .schema(appSchema)
      .from('osc')
      .select('id_osc, nombre_organizacion, email')
      .eq('id_osc', payload.organizationId)
      .maybeSingle();

    if (organizationError) {
      return NextResponse.json(
        { message: `No se pudo consultar la organización en osc: ${organizationError.message}` },
        { status: 400 },
      );
    }

    if (!organization) {
      return NextResponse.json(
        { message: 'No se encontró la organización asociada al documento.' },
        { status: 404 },
      );
    }

    const title = payload.status === 'aprobado' ? 'Documento aprobado' : 'Documento rechazado';
    const urgency = payload.status === 'aprobado' ? 'baja' : 'alta';
    const message = `Tu documento ${payload.documentName} fue ${payload.status}.`;

    const { error: avisoInsertError } = await supabaseAdmin
      .schema(appSchema)
      .from('avisos')
      .insert({
        titulo: title,
        mensaje: message,
        remitente: payload.reviewerName,
        id_osc: payload.organizationId,
        estado: 'no leido',
        urgencia: urgency,
        categoria: 'documento',
      });

    if (avisoInsertError) {
      return NextResponse.json(
        { message: `No se pudo registrar el aviso en avisos: ${avisoInsertError.message}` },
        { status: 400 },
      );
    }

    const organizationEmail = String(organization.email ?? '').trim().toLowerCase();

    if (!organizationEmail) {
      return NextResponse.json(
        { message: 'La organización no tiene correo configurado para recibir la notificación.' },
        { status: 400 },
      );
    }

    await sendEmailWithResend({
      recipient: organizationEmail,
      organizationName: String(organization.nombre_organizacion ?? 'Organización').trim() || 'Organización',
      documentName: payload.documentName,
      status: payload.status,
      reviewerName: payload.reviewerName,
    });

    const isSatDonorReportApproved =
      payload.status === 'aprobado' &&
      payload.documentName.trim().toLowerCase() === SAT_DONOR_REPORT_NAME.toLowerCase();

    if (isSatDonorReportApproved) {
      await recalculateOrganizationRisk(supabaseAdmin, payload.organizationId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado enviando notificación de documento.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
