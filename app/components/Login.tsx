// components/Login.tsx
// Este componente es el formulario de login para la aplicación, permite a los usuarios ingresar su correo electrónico 
// y contraseña para autenticarse, maneja la autenticación con Supabase, valida la sesión y redirige a la página correspondiente 
// según el tipo de usuario (administrador u organización),
// también incluye una opción para recuperar contraseña que envía un correo de restablecimiento a través de Supabase, y muestra 
// mensajes de error si las credenciales son incorrectas o si hay problemas de conexión.

"use client"

import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router';
import { AlertCircle, CheckCircle, Mail } from 'lucide-react';
import Image from 'next/image';
import type { User } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

type AppUserType = 'admin' | 'organization';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveryLoading, setIsRecoveryLoading] = useState(false);

  const appSchema = process.env.NEXT_PUBLIC_SUPABASE_APP_SCHEMA ?? 'public';
  const authSetPasswordPath = process.env.NEXT_PUBLIC_AUTH_SET_PASSWORD_PATH ?? '/auth/set-password';
  const workerTables = (process.env.NEXT_PUBLIC_SUPABASE_WORKER_TABLES ?? 'trabajador,trabajadores')
    .split(',')
    .map((table) => table.trim())
    .filter(Boolean);
  const organizationTables = (process.env.NEXT_PUBLIC_SUPABASE_ORG_TABLES ?? 'appleseed,organizacion,organizaciones')
    .split(',')
    .map((table) => table.trim())
    .filter(Boolean);

  const safeColumnMissingError = (message: string) => {
    const normalizedMessage = message.toLowerCase();
    return normalizedMessage.includes('does not exist') || normalizedMessage.includes('column');
  };

  const safeTableMissingError = (message: string) => {
    const normalizedMessage = message.toLowerCase();
    return (
      normalizedMessage.includes('could not find the table') ||
      normalizedMessage.includes('relation')
    );
  };

  const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);

  const getOriginFromSiteUrl = () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!siteUrl) {
      return undefined;
    }

    try {
      return new URL(siteUrl).origin;
    } catch {
      return undefined;
    }
  };

  const getSetPasswordRedirectTo = () => {
    const normalizedPath = normalizePath(authSetPasswordPath);

    if (typeof window !== 'undefined') {
      return `${window.location.origin}${normalizedPath}`;
    }

    const siteOrigin = getOriginFromSiteUrl();

    if (siteOrigin) {
      return `${siteOrigin.replace(/\/$/, '')}${normalizedPath}`;
    }

    return undefined;
  };

  const hasAuthTokensInUrl = () => {
    const searchParams = new URLSearchParams(location.search);
    const hashParams = new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash);

    const hasCode = Boolean(searchParams.get('code'));
    const hasTokenHash = Boolean(searchParams.get('token_hash'));
    const hasAccessToken = Boolean(hashParams.get('access_token'));
    const hasRefreshToken = Boolean(hashParams.get('refresh_token'));
    const hasType = Boolean(searchParams.get('type') ?? hashParams.get('type'));

    return hasCode || hasTokenHash || hasAccessToken || hasRefreshToken || hasType;
  };

  useEffect(() => {
    if (!hasAuthTokensInUrl()) {
      return;
    }

    const nextUrl = `/auth/set-password${location.search}${location.hash}`;
    navigate(nextUrl, { replace: true });
  }, [location.hash, location.search, navigate]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const supabase = getSupabaseClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'PASSWORD_RECOVERY') {
        return;
      }

      navigate('/auth/set-password', { replace: true });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const findUserByUuidInTable = async (tableName: string, userId: string, possibleUuidColumns: string[]) => {
    const supabase = getSupabaseClient();

    for (const column of possibleUuidColumns) {
      const { data, error } = await supabase
        .schema(appSchema)
        .from(tableName)
        .select('*')
        .eq(column, userId)
        .maybeSingle();

      if (error) {
        if (safeColumnMissingError(error.message)) {
          continue;
        }

        if (safeTableMissingError(error.message)) {
          return { record: null, tableMissing: true };
        }

        throw new Error(`Error consultando ${tableName}: ${error.message}`);
      }

      if (data) {
        return { record: data, tableMissing: false };
      }
    }

    return { record: null, tableMissing: false };
  };

  const resolveUserType = async (user: User): Promise<{ userType: AppUserType; record: Record<string, unknown> | null }> => {
    let missingWorkerTables = 0;
    for (const table of workerTables) {
      const { record, tableMissing } = await findUserByUuidInTable(table, user.id, [
        'id_trabajador',
        'uuid',
        'user_id',
        'auth_user_id',
        'id',
      ]);
      if (tableMissing) {
        missingWorkerTables += 1;
        continue;
      }

      if (record) {
        return { userType: 'admin', record: record as Record<string, unknown> };
      }
    }

    let missingOrganizationTables = 0;
    for (const table of organizationTables) {
      const { record, tableMissing } = await findUserByUuidInTable(table, user.id, [
        'id_osc',
        'uuid',
        'user_id',
        'auth_user_id',
        'id',
      ]);
      if (tableMissing) {
        missingOrganizationTables += 1;
        continue;
      }

      if (record) {
        return { userType: 'organization', record: record as Record<string, unknown> };
      }
    }

    if (missingWorkerTables === workerTables.length && missingOrganizationTables === organizationTables.length) {
      throw new Error(
        `No se encontraron las tablas configuradas en schema ${appSchema}. Revisa NEXT_PUBLIC_SUPABASE_WORKER_TABLES y NEXT_PUBLIC_SUPABASE_ORG_TABLES.`,
      );
    }

    throw new Error('Usuario autenticado, pero no existe en las tablas de trabajador u organización configuradas.');
  };

  const persistSessionAndRedirect = async (user: User) => {
    const { userType, record } = await resolveUserType(user);

    localStorage.setItem('appleseed_auth', 'true');
    localStorage.setItem('user_type', userType);

    if (userType === 'organization') {
      const organizationId = String(record?.id_osc ?? record?.id ?? record?.uuid ?? record?.organization_id ?? user.id);
      const organizationName = String(
        record?.nombre ??
          record?.nombre_osc ??
          record?.name ??
          record?.razon_social ??
          record?.organization_name ??
          user.email?.split('@')[0] ??
          'Organización',
      );

      localStorage.setItem('organization_id', organizationId);
      localStorage.setItem('organization_name', organizationName);
      navigate('/organization');
      return;
    }

    localStorage.removeItem('organization_id');
    localStorage.removeItem('organization_name');
    navigate('/');
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    if (hasAuthTokensInUrl()) {
      return;
    }

    const checkSession = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();

        if (data.session?.user) {
          await persistSessionAndRedirect(data.session.user);
        }
      } catch {
        // No-op: login form remains available
      }
    };

    void checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      setError('Por favor ingrese correo electrónico y contraseña');
      return;
    }

    if (!isSupabaseConfigured) {
      setError('Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message === 'Invalid login credentials' ? 'Credenciales incorrectas' : signInError.message);
        return;
      }

      if (!data.user) {
        setError('No se pudo iniciar sesión. Intenta nuevamente.');
        return;
      }

      await persistSessionAndRedirect(data.user);
    } catch (authError) {
      const message = authError instanceof Error ? authError.message : 'Error inesperado al iniciar sesión';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      setError('Supabase no está configurado. No se puede recuperar contraseña.');
      return;
    }

    setError('');
    setIsRecoveryLoading(true);

    try {
      const supabase = getSupabaseClient();
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(recoveryEmail.trim(), {
        redirectTo: getSetPasswordRedirectTo(),
      });

      if (recoveryError) {
        setError(recoveryError.message);
        return;
      }

      setRecoverySuccess(true);
      setTimeout(() => {
        setShowRecovery(false);
        setRecoverySuccess(false);
        setRecoveryEmail('');
      }, 3000);
    } catch (recoveryException) {
      const message = recoveryException instanceof Error ? recoveryException.message : 'Error inesperado al solicitar recuperación';
      setError(message);
    } finally {
      setIsRecoveryLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur-sm rounded-3xl border border-emerald-100 shadow-2xl shadow-emerald-900/10 p-8 sm:p-10">
          {/* Logo and Header */}
          <div className="text-center mb-8 sm:mb-10">
            <div className="inline-flex items-center justify-center mb-5">
              <Image
                src="/appleseedlogo.png"
                alt="Logo Appleseed México"
                width={320}
                height={128}
                className="w-56 h-auto object-contain"
                sizes="(max-width: 768px) 12rem, 14rem"
                priority
              />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700/90 mb-2">
              Acceso seguro
            </p>
            <h1 className="text-gray-700 text-base sm:text-lg font-semibold leading-relaxed">
              Portal de Prevención de Lavado de Dinero
            </h1>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-gray-800 px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition placeholder:text-gray-400"
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-gray-800 px-4 py-3 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none transition placeholder:text-gray-400"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-70 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition duration-200 shadow-lg shadow-emerald-600/30"
            >
              {isSubmitting ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-gray-100 text-center flex items-center justify-center gap-4">
            <button
              onClick={() => setShowRecovery(true)}
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              ¿Olvidaste tu contraseña?
            </button>
            <span className="text-gray-400">•</span>
            <Link
              to="/register"
              className="text-sm font-medium text-emerald-700 hover:text-emerald-800"
            >
              Registrar Organización
            </Link>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          Sistema seguro de gestión y prevención de lavado de dinero
        </p>
      </div>

      {/* Password Recovery Modal */}
      {showRecovery && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-emerald-100 shadow-2xl max-w-md w-full p-8">
            {!recoverySuccess ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Recuperar Contraseña
                  </h2>
                  <p className="text-gray-600">
                    Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
                  </p>
                </div>

                <form onSubmit={handleRecovery} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-800 focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 outline-none"
                      placeholder="tu@correo.com"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRecovery(false);
                        setRecoveryEmail('');
                      }}
                      className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isRecoveryLoading}
                      className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition disabled:opacity-70"
                    >
                      {isRecoveryLoading ? 'Enviando...' : 'Enviar Enlace'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  ¡Correo Enviado!
                </h2>
                <p className="text-gray-600">
                  Hemos enviado un enlace de recuperación a <strong>{recoveryEmail}</strong>. 
                  Revisa tu bandeja de entrada y spam.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}