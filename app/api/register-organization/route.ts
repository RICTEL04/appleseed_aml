import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RegisterOrganizationPayload {
  name: string;
  type: string;
  rfc: string;
  legalRepresentative: string;
  contact: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  activities: string;
  fundingSource: string;
}

const requiredFields: Array<keyof RegisterOrganizationPayload> = [
  'name',
  'type',
  'rfc',
  'legalRepresentative',
  'contact',
  'email',
  'address',
  'city',
  'state',
  'postalCode',
  'activities',
  'fundingSource',
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;
const appSchema = process.env.NEXT_PUBLIC_SUPABASE_APP_SCHEMA ?? 'public';

function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Faltan variables de entorno para registro: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY).',
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function isValidPayload(value: unknown): value is RegisterOrganizationPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  return requiredFields.every((field) => {
    const fieldValue = (value as Record<string, unknown>)[field];
    return typeof fieldValue === 'string' && fieldValue.trim().length > 0;
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        { message: 'Datos incompletos para registrar la organización.' },
        { status: 400 },
      );
    }

    const supabaseAdmin = getAdminClient();

    const inviteRedirectTo = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
      : undefined;

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      payload.email.trim().toLowerCase(),
      {
        redirectTo: inviteRedirectTo,
        data: {
          user_type: 'organization',
          organization_name: payload.name,
        },
      },
    );

    if (inviteError) {
      return NextResponse.json(
        { message: `No se pudo crear/invitar el usuario en Auth: ${inviteError.message}` },
        { status: 400 },
      );
    }

    const invitedUserId = inviteData.user?.id;

    if (!invitedUserId) {
      return NextResponse.json(
        { message: 'Supabase no devolvió el id del usuario invitado.' },
        { status: 500 },
      );
    }

    const fullAddress = `${payload.address}, ${payload.city}, ${payload.state}, CP ${payload.postalCode}`;

    const { error: oscInsertError } = await supabaseAdmin
      .schema(appSchema)
      .from('osc')
      .insert({
        id_osc: invitedUserId,
        nombre_organizacion: payload.name,
        tipo: payload.type,
        rfc: payload.rfc,
        representante: payload.legalRepresentative,
        telefono: payload.contact,
        email: payload.email.trim().toLowerCase(),
        direccion: fullAddress,
        actividades_principales: payload.activities,
        financiamiento: payload.fundingSource,
        riesgo: 'bajo',
        estado_verificacion: 'pendiente',
      });

    if (oscInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(invitedUserId);
      return NextResponse.json(
        { message: `No se pudo guardar la organización en tabla osc: ${oscInsertError.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        'Organización registrada. Se envió un correo para que la organización establezca su contraseña e inicie sesión.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado registrando la organización.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
