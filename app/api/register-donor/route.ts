// Archivo: app/api/register-donor/route.ts
// este archivo define una ruta API para registrar un nuevo donante en el sistema,incluye la validación del payload recibido, la creación de un usuario en Supabase Auth, el registro de la dirección y la información del donante en la base de datos,
// si ocurre algún error durante el proceso, se devuelve una respuesta con el mensaje correspondiente y se realizan limpiezas de datos si es necesario.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Definicion de tipos del payload esperado para registrar un donante, 
// incluyendo validaciones básicas de formato y campos requeridos.
interface DonorPayload {
  nombre: string;
  rfc: string;
  apellido_paterno?: string;
  apellido_materno?: string;
  fecha_nacimiento: string;
  email: string;
  telefono?: string;
  person_type?: 'fisica' | 'moral';
}

// Definicion de tipos del payload esperado para la direccion del donante,
// incluyendo validaciones básicas de formato y campos requeridos.
interface AddressPayload {
  calle: string;
  num_exterior: string;
  num_interior: string | null;
  cp: string;
  entidad_federativa: string;
  ciudad_alcaldia: string;
}

// Definicion del payload completo esperado para registrar un donante, 
// que incluye la informacion del donante, la direccion y la contraseña.
interface RegisterDonorPayload {
  donor: DonorPayload;
  address: AddressPayload;
  password: string;
}


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;
const appSchema = process.env.NEXT_PUBLIC_SUPABASE_APP_SCHEMA ?? 'public';

//obtenemos un cliente de supabase 
function getAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Faltan variables de entorno para registro de donantes: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY).',
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

//funcion para validar que el payload recibido en la solicitud 
//POST cumple con los requisitos necesarios para registrar un donante,
function isValidPayload(value: unknown): value is RegisterDonorPayload {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<RegisterDonorPayload>;

  if (!payload.donor || !payload.address || typeof payload.password !== 'string') {
    return false;
  }

  const donor = payload.donor as unknown as Record<string, unknown>;
  const address = payload.address as unknown as Record<string, unknown>;

  const requiredDonorFields = ['nombre', 'rfc', 'fecha_nacimiento', 'email'];
  const requiredAddressFields = ['calle', 'num_exterior', 'cp', 'entidad_federativa', 'ciudad_alcaldia'];

  const hasValidDonorFields = requiredDonorFields.every(
    (field) => typeof donor[field] === 'string' && (donor[field] as string).trim().length > 0,
  );

  if (!hasValidDonorFields) {
    return false;
  }

  const normalizedRfc = String(donor.rfc ?? '').trim().toUpperCase();
  const inferredPersonType = normalizedRfc.length === 12 ? 'moral' : 'fisica';
  const personType = donor.person_type === 'fisica' || donor.person_type === 'moral'
    ? donor.person_type
    : inferredPersonType;

  const hasRequiredPhysicalFields =
    personType === 'moral' || (
      typeof donor.apellido_paterno === 'string' && donor.apellido_paterno.trim().length > 0 &&
      typeof donor.apellido_materno === 'string' && donor.apellido_materno.trim().length > 0 &&
      typeof donor.telefono === 'string' && donor.telefono.trim().length > 0
    );

  const hasValidAddressFields = requiredAddressFields.every(
    (field) => typeof address[field] === 'string' && (address[field] as string).trim().length > 0,
  );

  return hasRequiredPhysicalFields && hasValidAddressFields && payload.password.trim().length >= 8;
}

//funcion para manejar las solicitudes POST a esta ruta, 
//que se encarga de registrar un nuevo donante en el sistema,
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as unknown;

    if (!isValidPayload(payload)) {
      return NextResponse.json(
        { message: 'Datos incompletos para registrar al donante.' },
        { status: 400 },
      );
    }

    const normalizedEmail = payload.donor.email.trim().toLowerCase();
    const normalizedRFC = payload.donor.rfc.trim().toUpperCase();
    const personType = payload.donor.person_type === 'fisica' || payload.donor.person_type === 'moral'
      ? payload.donor.person_type
      : normalizedRFC.length === 12
        ? 'moral'
        : 'fisica';
    const supabaseAdmin = getAdminClient();

    const { data: existingDonorByEmail, error: existingDonorByEmailError } = await supabaseAdmin
      .schema(appSchema)
      .from('donantes')
      .select('email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingDonorByEmailError && existingDonorByEmailError.code !== 'PGRST116') {
      return NextResponse.json(
        { message: `No se pudo validar el correo del donante: ${existingDonorByEmailError.message}` },
        { status: 400 },
      );
    }

    if (existingDonorByEmail) {
      return NextResponse.json(
        { message: 'Este donante ya tiene cuenta. Inicia sesión para continuar.' },
        { status: 409 },
      );
    }

    const { data: existingDonorByRFC, error: existingDonorByRFCError } = await supabaseAdmin
      .schema(appSchema)
      .from('donantes')
      .select('rfc')
      .eq('rfc', normalizedRFC)
      .maybeSingle();

    if (existingDonorByRFCError && existingDonorByRFCError.code !== 'PGRST116') {
      return NextResponse.json(
        { message: `No se pudo validar el RFC del donante: ${existingDonorByRFCError.message}` },
        { status: 400 },
      );
    }

    if (existingDonorByRFC) {
      return NextResponse.json(
        { message: 'Ya existe un donante registrado con ese RFC. Inicia sesión para continuar.' },
        { status: 409 },
      );
    }

    const { data: createUserData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        user_type: 'donador',
      },
    });

    if (createUserError) {
      return NextResponse.json(
        { message: `No se pudo crear el usuario del donante: ${createUserError.message}` },
        { status: 400 },
      );
    }

    const createdUserId = createUserData.user?.id;

    if (!createdUserId) {
      return NextResponse.json(
        { message: 'Supabase no devolvió el id del usuario donante.' },
        { status: 500 },
      );
    }

    const { data: addressInsertData, error: addressInsertError } = await supabaseAdmin
      .schema(appSchema)
      .from('direccion')
      .insert({
        calle: payload.address.calle.trim(),
        num_exterior: payload.address.num_exterior.trim(),
        num_interior: payload.address.num_interior?.trim() || null,
        cp: payload.address.cp.trim(),
        entidad_federativa: payload.address.entidad_federativa.trim(),
        ciudad_alcaldia: payload.address.ciudad_alcaldia.trim(),
      })
      .select('id_direccion')
      .single();

    if (addressInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);

      return NextResponse.json(
        { message: `No se pudo guardar la dirección del donante: ${addressInsertError.message}` },
        { status: 400 },
      );
    }

    const idDireccion = addressInsertData?.id_direccion;

    if (!idDireccion) {
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);

      return NextResponse.json(
        { message: 'No se obtuvo id_direccion después de crear la dirección del donante.' },
        { status: 500 },
      );
    }

    const { error: donorInsertError } = await supabaseAdmin
      .schema(appSchema)
      .from('donantes')
      .insert({
        nombre: payload.donor.nombre.trim(),
        rfc: normalizedRFC,
        apellido_paterno: personType === 'moral' ? '' : (payload.donor.apellido_paterno ?? '').trim(),
        apellido_materno: personType === 'moral' ? '' : (payload.donor.apellido_materno ?? '').trim(),
        fecha_nacimiento: payload.donor.fecha_nacimiento,
        email: normalizedEmail,
        telefono: personType === 'moral' ? '' : (payload.donor.telefono ?? '').trim(),
        id_direccion: idDireccion,
      });

    if (donorInsertError) {
      await supabaseAdmin.schema(appSchema).from('direccion').delete().eq('id_direccion', idDireccion);
      await supabaseAdmin.auth.admin.deleteUser(createdUserId);

      return NextResponse.json(
        { message: `No se pudo guardar el donante: ${donorInsertError.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: 'Donante registrado con cuenta confirmada automáticamente.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado registrando al donante.';
    return NextResponse.json({ message }, { status: 500 });
  }
}