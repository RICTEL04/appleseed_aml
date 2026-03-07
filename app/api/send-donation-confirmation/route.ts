// Archivo: app/api/send-donation-confirmation/route.ts
//este archivo define una ruta API para enviar una confirmación de donación al donante, utilizando el servicio de Resend para el envío de correos,
//incluye la validación del payload recibido para asegurarse de que se proporcionen todos los campos requeridos y que tengan el formato correcto,
//si el envío del correo falla, se devuelve un error con el mensaje correspondiente.
import { NextResponse } from 'next/server';

// Definicion de tipos del payload esperado para enviar una confirmación de donación,
// incluyendo validaciones básicas de formato y campos requeridos.
interface DonationConfirmationPayload {
  donorEmail: string;
  donorName: string;
  amount: number;
  paymentType: 'transferencia' | 'ficha' | 'en linea';
  folio: string;
  organizationName: string;
}

const resendApiKey = process.env.RESEND_API_KEY;
const senderEmail = process.env.DONATIONS_FROM_EMAIL ?? 'donaciones@appleseed.mx';

//funcion para validar que el payload recibido en la solicitud POST
//cumple con los requisitos necesarios para enviar una confirmación de donación,
//asegurando que se proporcionen todos los campos requeridos, que tengan el formato correcto y que el monto sea un número positivo.
function isValidPayload(value: unknown): value is DonationConfirmationPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.donorEmail === 'string' &&
    payload.donorEmail.trim().length > 0 &&
    typeof payload.donorName === 'string' &&
    payload.donorName.trim().length > 0 &&
    typeof payload.amount === 'number' &&
    Number.isFinite(payload.amount) &&
    payload.amount > 0 &&
    typeof payload.paymentType === 'string' &&
    ['transferencia', 'ficha', 'en linea'].includes(payload.paymentType) &&
    typeof payload.folio === 'string' &&
    payload.folio.trim().length > 0 &&
    typeof payload.organizationName === 'string' &&
    payload.organizationName.trim().length > 0
  );
}

//funcion para manejar las solicitudes POST a esta ruta,
//que se encarga de enviar un correo de confirmación de donación al donante,
//utilizando el servicio de Resend para el envío de correos,
//si el envío del correo falla, se devuelve un error con el mensaje correspondiente.
export async function POST(request: Request) {
  try {
    if (!resendApiKey) {
      return NextResponse.json(
        { message: 'Falta configurar RESEND_API_KEY para enviar correos.' },
        { status: 500 },
      );
    }

    const payload = (await request.json()) as unknown;

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        { message: 'Datos incompletos para enviar confirmación de donación.' },
        { status: 400 },
      );
    }

    const amountFormatted = payload.amount.toLocaleString('es-MX', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h2 style="margin: 0 0 16px 0;">Confirmación de donación</h2>
        <p>Hola ${payload.donorName},</p>
        <p>Tu donación fue registrada exitosamente con los siguientes datos:</p>
        <ul>
          <li><strong>Folio:</strong> ${payload.folio}</li>
          <li><strong>Monto:</strong> $${amountFormatted} MXN</li>
          <li><strong>Tipo de pago:</strong> ${payload.paymentType}</li>
          <li><strong>Organización beneficiaria:</strong> ${payload.organizationName}</li>
        </ul>
        <p>Gracias por tu apoyo.</p>
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
        to: [payload.donorEmail],
        subject: `Confirmación de donación ${payload.folio}`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const responseText = await resendResponse.text();
      return NextResponse.json(
        { message: `No se pudo enviar el correo de confirmación: ${responseText}` },
        { status: 502 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado enviando correo de confirmación.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
