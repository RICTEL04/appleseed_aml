import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SECRET_KEY;

const SAT_BUCKET_NAME = 'listas-aml';
const SAT_FILE_PATH = 'lista_negra_sat.csv';

function getServiceClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Faltan variables de entorno para validar RFC: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY).',
    );
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function normalizeRfc(value: string) {
  return value.toUpperCase().trim().replace(/\s+/g, '');
}

function decodeCsvBuffer(arrayBuffer: ArrayBuffer) {
  const utf8Text = new TextDecoder('utf-8').decode(arrayBuffer);

  if (utf8Text.includes('�')) {
    return new TextDecoder('windows-1252').decode(arrayBuffer);
  }

  return utf8Text;
}

function parseCsvRows(content: string) {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    const nextChar = content[index + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === ',' && !insideQuotes) {
      currentRow.push(currentField);
      currentField = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      currentRow.push(currentField);
      currentField = '';

      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((cell) => cell.trim().length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

function buildRfcSet(rows: string[][]) {
  const rfcPattern = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
  const rfcSet = new Set<string>();

  for (const row of rows) {
    if (row.length < 2) {
      continue;
    }

    const candidateRfc = normalizeRfc(row[1] ?? '');

    if (rfcPattern.test(candidateRfc)) {
      rfcSet.add(candidateRfc);
    }
  }

  return rfcSet;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { rfc?: string };
    const normalizedRfc = normalizeRfc(body.rfc ?? '');

    if (!normalizedRfc) {
      return NextResponse.json(
        { message: 'Debes enviar un RFC para validar.' },
        { status: 400 },
      );
    }

    const supabase = getServiceClient();
    const { data: file, error: fileError } = await supabase.storage
      .from(SAT_BUCKET_NAME)
      .download(SAT_FILE_PATH);

    if (fileError || !file) {
      return NextResponse.json(
        { message: `No fue posible descargar ${SAT_FILE_PATH} del bucket ${SAT_BUCKET_NAME}: ${fileError?.message ?? 'archivo no disponible'}` },
        { status: 500 },
      );
    }

    const buffer = await file.arrayBuffer();
    const csvText = decodeCsvBuffer(buffer);
    const rows = parseCsvRows(csvText);
    const blacklistSet = buildRfcSet(rows);

    const isBlacklisted = blacklistSet.has(normalizedRfc);

    return NextResponse.json({
      isBlacklisted,
      message: isBlacklisted
        ? 'No se puede continuar: RFC detectado en lista negra SAT.'
        : 'RFC validado correctamente. No se encontró en lista negra SAT.',
      source: 'supabase-storage',
      bucket: SAT_BUCKET_NAME,
      file: SAT_FILE_PATH,
      totalRfcLoaded: blacklistSet.size,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error inesperado validando RFC contra lista negra SAT.';
    return NextResponse.json({ message }, { status: 500 });
  }
}