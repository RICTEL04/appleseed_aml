# appleseed_aml

Plataforma AML para gestión de organizaciones, revisión documental y flujo de donaciones.

## Tabla de contenido

- [Descripción funcional](#descripción-funcional)
- [Stack principal](#stack-principal)
- [Arquitectura de frontend y ruteo](#arquitectura-de-frontend-y-ruteo)
- [Módulos principales](#módulos-principales)
- [Flujos de usuario](#flujos-de-usuario)
- [APIs internas (Route Handlers)](#apis-internas-route-handlers)
- [Configuración de entorno](#configuración-de-entorno)
- [Quick start local](#quick-start-local)
- [Dependencias de datos esperadas en Supabase](#dependencias-de-datos-esperadas-en-supabase)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Buenas prácticas y seguridad](#buenas-prácticas-y-seguridad)
- [Troubleshooting](#troubleshooting)
- [Scripts disponibles](#scripts-disponibles)

## Descripción funcional

La aplicación está pensada para dos tipos de actor:

1. **Admin / trabajador**
	- Ve métricas AML y operación.
	- Gestiona organizaciones.
	- Envía anuncios generales o por organización.
	- Revisa documentos de cumplimiento y dispara notificaciones.

2. **Organización (OSC)**
	- Gestiona su perfil, dirección y cuenta bancaria.
	- Consulta y responde flujo documental.
	- Consulta avisos y métricas propias.
	- Comparte su liga de donación para recibir aportaciones.

También existe el flujo de **donante**, con registro/login, validación RFC y confirmación por correo.

## Stack principal

- **Next.js 16 + React 19 + TypeScript**
- **Tailwind CSS 4**
- **Supabase** (Auth, PostgREST y Storage)
- **React Router DOM** para navegación interna del portal
- **Resend** para envío de correos transaccionales

## Arquitectura de frontend y ruteo

Aunque el proyecto usa Next.js (App Router), la navegación principal del frontend vive en `react-router-dom`:

- `app/page.tsx` carga dinámicamente `app/routes.tsx` y monta `RouterProvider`.
- `app/[...slug]/page.tsx` reexporta `app/page.tsx` para soportar rutas profundas.

Esto permite mantener una experiencia SPA dentro de un proyecto Next.js, mientras se conservan los `Route Handlers` de `app/api/*` para lógica server-side.

Rutas principales definidas en `app/routes.tsx`:

- `/login`
- `/register`
- `/auth/set-password`
- `/donate/:id_organizacion` y `/donacion/:id_organizacion`
- Admin:
	- `/`
	- `/organizations`
	- `/organizations/register`
- Organización:
	- `/organization`
	- `/organization/donations`
	- `/organization/announcements`
	- `/organization/documents`
	- `/organization/messages`
	- `/organization/profile`

## Módulos principales

- **Dashboard admin**: métricas de verificación, alertas AML, documentos y donaciones.
- **Organizaciones**: listado, riesgo, estado, documentos pendientes y modales de acción.
- **Documentos (OSC y admin)**:
	- OSC: carga/reenvío y seguimiento por estado.
	- Admin: revisión/aprobación/rechazo y notificación.
- **Anuncios**:
	- Admin: envío individual o masivo.
	- OSC: bandeja y lectura de avisos.
- **Donaciones**:
	- Captura de datos del donante.
	- Validación RFC (lista negra SAT).
	- Registro de donación y confirmación por correo.

## Flujos de usuario

### 1) Inicio de sesión y sesión activa

- El login valida usuario en Auth de Supabase.
- Se resuelve tipo de usuario (`admin` / `organization`) consultando tablas configuradas por variables de entorno.
- La sesión se persiste con llaves de `localStorage`:
	- `appleseed_auth`
	- `user_type`
	- `organization_id`
	- `organization_name`
- Los layouts (`Layout` y `OrganizationLayout`) revalidan sesión contra Supabase en eventos de interacción y visibilidad de pestaña.

### 2) Registro de organización

Proceso en `POST /api/register-organization`:

1. Crear usuario en `auth.users` con contraseña inicial.
2. Crear registro en `direccion`.
3. Crear registro en `osc` enlazando `id_osc` con UUID de Auth y `id_direccion`.
4. Si falla un paso, se aplica limpieza (rollback manual de recursos ya creados).

### 3) Registro de donante

Proceso en `POST /api/register-donor`:

1. Validar payload y reglas por tipo de persona (`fisica`/`moral`).
2. Evitar duplicados por email/RFC en `donantes`.
3. Crear usuario Auth.
4. Crear dirección.
5. Insertar donante en tabla `donantes`.
6. Si falla una etapa intermedia, se eliminan recursos creados.

### 4) Revisión documental y riesgo AML

- Al aprobar/rechazar un documento, se crea aviso en `avisos` y se envía correo por Resend.
- Si se aprueba el documento `Reporte donador al SAT`, el backend recalcula riesgo de la OSC usando:
	- documentos SAT pendientes/no aprobados
	- alertas AML umbral 1 en ventana reciente

## APIs internas (Route Handlers)

- `POST /api/register-organization`
	- Crea usuario Auth + dirección + registro en tabla `osc`.
- `POST /api/register-donor`
	- Crea usuario donante, dirección y registro en `donantes`.
- `POST /api/send-donation-confirmation`
	- Envía correo de confirmación de donación.
- `POST /api/send-document-review-notification`
	- Registra aviso a OSC + envío de correo + recalcula riesgo en casos específicos.
- `POST /api/validate-rfc-blacklist`
	- Valida RFC contra CSV en Supabase Storage (`listas-aml/lista_negra_sat.csv`).
- `POST /api/organization-chat`
	- Chatbot para organizaciones con orientacion sobre cumplimiento AML y uso del portal.

### Ejemplos de payload

#### `POST /api/register-organization`

```json
{
	"name": "Fundación Ejemplo",
	"type": "Asociación Civil",
	"rfc": "ABC123456T12",
	"legalRepresentative": "Nombre Representante",
	"contact": "5512345678",
	"email": "org@example.com",
	"street": "Av. Reforma",
	"exteriorNumber": "123",
	"interiorNumber": "4B",
	"city": "Ciudad de México",
	"state": "Ciudad de México",
	"postalCode": "06000",
	"activities": "Asistencia social",
	"fundingSource": "Donaciones"
}
```

#### `POST /api/register-donor`

```json
{
	"donor": {
		"nombre": "Ana",
		"apellido_paterno": "Pérez",
		"apellido_materno": "López",
		"fecha_nacimiento": "1990-10-20",
		"rfc": "PELA901020ABC",
		"email": "ana@example.com",
		"telefono": "5512345678",
		"person_type": "fisica"
	},
	"address": {
		"calle": "Insurgentes Sur",
		"num_exterior": "100",
		"num_interior": "10",
		"cp": "03100",
		"entidad_federativa": "Ciudad de México",
		"ciudad_alcaldia": "Benito Juárez"
	},
	"password": "PasswordSeguro123"
}
```

#### `POST /api/send-donation-confirmation`

```json
{
	"donorEmail": "ana@example.com",
	"donorName": "Ana Pérez",
	"amount": 1500,
	"paymentType": "transferencia",
	"folio": "DON-2026-0001",
	"organizationName": "Fundación Ejemplo"
}
```

#### `POST /api/send-document-review-notification`

```json
{
	"organizationId": "uuid-org",
	"documentName": "Reporte donador al SAT",
	"status": "aprobado",
	"reviewerName": "Equipo AML"
}
```

#### `POST /api/validate-rfc-blacklist`

```json
{
	"rfc": "PELA901020ABC"
}
```

## Requisitos

- Node.js 20+
- npm 10+
- Proyecto Supabase con tablas/estructura del sistema
- (Opcional) cuenta de Resend para correos

## Configuración de entorno

### Plantilla base de `.env`

Crea un archivo `.env` en la raíz:

```env
# Supabase (cliente)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Alternativas de clave pública (si no usas ANON_KEY)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

# Supabase (server/admin para rutas API)
SUPABASE_SERVICE_ROLE_KEY=
# o alternativa:
# SUPABASE_SECRET_KEY=

# Esquema y tablas
NEXT_PUBLIC_SUPABASE_APP_SCHEMA=public
NEXT_PUBLIC_SUPABASE_WORKER_TABLES=trabajador
NEXT_PUBLIC_SUPABASE_ORG_TABLES=osc
NEXT_PUBLIC_SUPABASE_DIRECTION_TABLE=direccion

# Auth UX
NEXT_PUBLIC_AUTH_SET_PASSWORD_PATH=/auth/set-password
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Validación RFC (opcional endpoint externo)

# Chatbot AML (opcional)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
NEXT_PUBLIC_RFC_VALIDATION_URL=

# Correos (Resend)
RESEND_API_KEY=
DONATIONS_FROM_EMAIL=donaciones@appleseedaml.solutions
DOCUMENT_REVIEW_FROM_EMAIL=
```

> Recomendación: no subas `.env` al repositorio y rota llaves si alguna se expone.

### Valores actuales de este proyecto (referencia)

Con base en tu configuración actual, este es el set usado en desarrollo:

```env
NEXT_PUBLIC_SUPABASE_URL=https://id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_yNmpb_ShSVx5OBkA2CXp5w_YjIOhwj0
NEXT_PUBLIC_SUPABASE_WORKER_TABLES=trabajador
NEXT_PUBLIC_SUPABASE_ORG_TABLES=osc
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJI...<redacted>...f7ZK-SpuYLA
RESEND_API_KEY=re_XXCNmBqG...<redacted>...1i84w
DONATIONS_FROM_EMAIL=donaciones@appleseedaml.solutions
```

> Nota de seguridad: se muestran enmascaradas las llaves secretas. Mantén los valores completos solo en `.env` local o en secretos del proveedor de despliegue.

### Referencia de variables (qué hace cada una)

| Variable | Tipo | Obligatoria | Uso |
|---|---|---:|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pública | Sí | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | Sí* | Clave para cliente frontend (`lib/supabase.ts`) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | pública | Alternativa | Fallback de clave pública |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | pública | Alternativa | Fallback adicional de clave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | secreta | Sí** | Operaciones admin en APIs internas |
| `SUPABASE_SECRET_KEY` | secreta | Alternativa | Fallback para service key |
| `NEXT_PUBLIC_SUPABASE_APP_SCHEMA` | pública | No | Esquema SQL usado por APIs/layouts (default: `public`) |
| `NEXT_PUBLIC_SUPABASE_WORKER_TABLES` | pública | No | Tablas para resolver login de admin |
| `NEXT_PUBLIC_SUPABASE_ORG_TABLES` | pública | No | Tablas para resolver login de organización/repositorio OSC |
| `NEXT_PUBLIC_SUPABASE_DIRECTION_TABLE` | pública | No | Nombre de tabla de direcciones |
| `NEXT_PUBLIC_AUTH_SET_PASSWORD_PATH` | pública | No | Ruta de set/reset password |
| `NEXT_PUBLIC_SITE_URL` | pública | No | Base URL para redirecciones de auth |
| `NEXT_PUBLIC_RFC_VALIDATION_URL` | pública | No | Endpoint externo opcional de validación RFC |
| `RESEND_API_KEY` | secreta | Sí*** | Envío de emails transaccionales |
| `DONATIONS_FROM_EMAIL` | pública/ops | No | Remitente para confirmaciones de donación |
| `DOCUMENT_REVIEW_FROM_EMAIL` | pública/ops | No | Remitente para revisión documental |

- \* Debe existir esta u otra clave pública fallback.
- \** Obligatoria para `register-*`, `validate-rfc-blacklist` y notificaciones con inserciones server-side.
- \*** Obligatoria si se desea envío real de correos.

## Quick start local

1. Instalar dependencias:

	 ```bash
	 npm install
	 ```

2. Configurar `.env` (ver sección anterior).

3. Ejecutar en desarrollo:

	 ```bash
	 npm run dev
	 ```

4. Abrir `http://localhost:3000`.

5. (Recomendado) Verificar lint:

	 ```bash
	 npm run lint
	 ```

## Credenciales de prueba

Para pruebas funcionales en el entorno actual:

- **Trabajador (admin)**
	- Email: `appleseed@gmail.com`
	- Contraseña: `AML123`

- **Organización (OSC)**
	- Email: `contacto@horizonteverde.org`
	- Contraseña: `AML123`
	- Link módulo donaciones: `https://www.appleseedaml.solutions/donacion/365f852b-15bd-4e1b-9d6a-0f5ccffed7a1` 

> Estas credenciales son para testing.

## Dependencias de datos esperadas en Supabase

Para operar correctamente, el proyecto espera entidades equivalentes a:

- `trabajador` (admins)
- `osc` (organizaciones)
- `direccion`
- `donantes` (donantes)
- `donaciones`
- `documentos`
- `avisos`
- `alertas_aml`
- Bucket Storage: `listas-aml`, archivo `lista_negra_sat.csv`
- Bucket Storage: `documentos`

Además, el UUID de `auth.users` se utiliza como identificador principal para ciertos perfiles (`id_osc` y `id_trabajador` en varios flujos).

## Estructura de carpetas

- `app/`
	- Shell app, páginas, rutas de React Router y APIs (`app/api/*`).
- `app/components/`
	- Componentes de UI por dominio (dashboard, documentos, donaciones, auth, etc.).
- `app/hooks/`
	- Integración de estado/operaciones por módulo.
- `lib/models/`
	- Modelos tipados para entidades de dominio.
- `lib/repositories/`
	- Capa de acceso a datos sobre Supabase.
- `lib/supabase.ts`
	- Cliente singleton de Supabase y validación de configuración.

## Buenas prácticas y seguridad

- Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` fuera del backend.
- No compartas `.env` ni pegues llaves en issues/PRs.
- Si una llave se expone, rótala de inmediato en el proveedor.
- Limita permisos del bucket `listas-aml` según política de mínimo privilegio.
- Revisa validaciones de payload al extender endpoints.

## Troubleshooting

### Error: Supabase no configurado

- Verifica `NEXT_PUBLIC_SUPABASE_URL` y una clave pública válida (`NEXT_PUBLIC_SUPABASE_ANON_KEY` o fallback).

### Error en endpoints `register-*` o `validate-rfc-blacklist`

- Revisa `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_SECRET_KEY`).
- Confirma que el esquema (`NEXT_PUBLIC_SUPABASE_APP_SCHEMA`) y nombres de tabla sean correctos.

### No llegan correos

- Revisa `RESEND_API_KEY` y remitentes configurados.
- Verifica respuestas de error de `/api/send-donation-confirmation` y `/api/send-document-review-notification`.

### Login correcto pero sin redirección

- Valida `NEXT_PUBLIC_SUPABASE_WORKER_TABLES` / `NEXT_PUBLIC_SUPABASE_ORG_TABLES`.
- Confirma que el usuario exista en la tabla correspondiente con UUID de Auth.

## Scripts disponibles

- `npm run dev` - entorno local
- `npm run build` - build de producción
- `npm run start` - ejecutar build
- `npm run lint` - lint con ESLint

## Lint y calidad

```bash
npm run lint
```