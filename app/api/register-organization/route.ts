import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface RegisterOrganizationPayload {
  name: string;
  type: string;
  rfc: string;
  legalRepresentative: string;
  contact: string;
  email: string;
  street: string;
  exteriorNumber: string;
  interiorNumber: string;
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
  'street',
  'exteriorNumber',
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
const DEFAULT_ORGANIZATION_PASSWORD = 'AML123';

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

    const { data: createUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.email.trim().toLowerCase(),
      password: DEFAULT_ORGANIZATION_PASSWORD,
      email_confirm: true,
      user_metadata: {
        user_type: 'organization',
        organization_name: payload.name,
      },
    });

    if (createUserError) {
      return NextResponse.json(
        { message: `No se pudo crear el usuario en Auth: ${createUserError.message}` },
        { status: 400 },
      );
    }

    const invitedUserId = createUserData.user?.id;

    if (!invitedUserId) {
      return NextResponse.json(
        { message: 'Supabase no devolvió el id del usuario invitado.' },
        { status: 500 },
      );
    }

    // Proceso 1: crear direccion
    const { data: addressInsertData, error: addressInsertError } = await supabaseAdmin
      .schema(appSchema)
      .from('direccion')
      .insert({
        calle: payload.street,
        num_exterior: payload.exteriorNumber,
        num_interior: payload.interiorNumber.trim(),
        cp: payload.postalCode,
        entidad_federativa: payload.state,
        ciudad_alcaldia: payload.city,
      })
      .select('id_direccion')
      .single();

    if (addressInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(invitedUserId);

      return NextResponse.json(
        { message: `No se pudo guardar la dirección en tabla direccion: ${addressInsertError.message}` },
        { status: 400 },
      );
    }

    const idDireccion = addressInsertData?.id_direccion;

    if (!idDireccion) {
      await supabaseAdmin.auth.admin.deleteUser(invitedUserId);

      return NextResponse.json(
        { message: 'No se obtuvo id_direccion después de crear la dirección.' },
        { status: 500 },
      );
    }

    // Proceso 2: crear OSC relacionado a direccion
    const { error: oscInsertError } = await supabaseAdmin
      .schema(appSchema)
      .from('osc')
      .insert({
        id_osc: invitedUserId,
        id_direccion: idDireccion,
        nombre_organizacion: payload.name,
        tipo: payload.type,
        rfc: payload.rfc,
        representante: payload.legalRepresentative,
        telefono: payload.contact,
        email: payload.email.trim().toLowerCase(),
        actividades_principales: payload.activities,
        financiamiento: payload.fundingSource,
        riesgo: 'bajo',
        estado_verificacion: 'pendiente',
      });

    if (oscInsertError) {
      await supabaseAdmin.schema(appSchema).from('direccion').delete().eq('id_direccion', idDireccion);
      await supabaseAdmin.auth.admin.deleteUser(invitedUserId);

      return NextResponse.json(
        { message: `No se pudo guardar la organización en tabla osc: ${oscInsertError.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        'Organización registrada. Contraseña inicial asignada: AML123.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado registrando la organización.';
    return NextResponse.json({ message }, { status: 500 });
  }
}
