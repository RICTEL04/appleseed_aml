"use client"

import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

type SupportedOtpType = 'invite' | 'recovery' | 'magiclink' | 'signup';

const supportedOtpTypes: SupportedOtpType[] = ['invite', 'recovery', 'magiclink', 'signup'];

function normalizePath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

export function SetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifyingLink, setIsVerifyingLink] = useState(true);
  const [canSetPassword, setCanSetPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const hashParams = useMemo(
    () => new URLSearchParams(location.hash.startsWith('#') ? location.hash.slice(1) : location.hash),
    [location.hash],
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('Supabase no está configurado. No se puede continuar con este enlace.');
      setIsVerifyingLink(false);
      return;
    }

    let isMounted = true;

    const verifyAndCreateSession = async () => {
      try {
        const supabase = getSupabaseClient();
        const code = params.get('code');
        const tokenHash = params.get('token_hash');
        const type = params.get('type') ?? hashParams.get('type');
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            throw new Error(exchangeError.message);
          }
        } else if (tokenHash && type && supportedOtpTypes.includes(type as SupportedOtpType)) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as SupportedOtpType,
          });

          if (otpError) {
            throw new Error(otpError.message);
          }
        } else if (accessToken && refreshToken) {
          const { error: sessionFromHashError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionFromHashError) {
            throw new Error(sessionFromHashError.message);
          }
        }

        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw new Error(sessionError.message);
        }

        if (!data.session) {
          throw new Error('El enlace no es válido o ya expiró. Solicita uno nuevo.');
        }

        if (isMounted) {
          setCanSetPassword(true);
          setError('');
        }
      } catch (verificationError) {
        const message =
          verificationError instanceof Error
            ? verificationError.message
            : 'No fue posible validar el enlace. Solicita uno nuevo.';

        if (isMounted) {
          setCanSetPassword(false);
          setError(message);
        }
      } finally {
        if (isMounted) {
          setIsVerifyingLink(false);
        }
      }
    };

    void verifyAndCreateSession();

    return () => {
      isMounted = false;
    };
  }, [hashParams, params]);

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canSetPassword || isVerifyingLink) {
      return;
    }

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const supabase = getSupabaseClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        throw new Error(updateError.message);
      }

      setSuccess(true);

      window.setTimeout(() => {
        navigate('/login');
      }, 1200);
    } catch (updatePasswordError) {
      const message =
        updatePasswordError instanceof Error
          ? updatePasswordError.message
          : 'No fue posible actualizar la contraseña.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const authPath = normalizePath(process.env.NEXT_PUBLIC_AUTH_SET_PASSWORD_PATH ?? '/auth/set-password');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-full mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Establecer contraseña</h1>
            <p className="text-gray-600">Define una contraseña segura para tu cuenta.</p>
          </div>

          {isVerifyingLink ? (
            <p className="text-sm text-gray-600 text-center">Validando enlace seguro...</p>
          ) : success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Contraseña actualizada!</h2>
              <p className="text-gray-600">Serás redirigido para continuar con tu sesión.</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {canSetPassword ? (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nueva contraseña</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="Mínimo 8 caracteres"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar contraseña</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full text-gray-700 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                      placeholder="Repite la contraseña"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-medium transition"
                  >
                    {isSubmitting ? 'Guardando...' : 'Guardar contraseña'}
                  </button>
                </form>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-sm text-gray-600">Solicita un nuevo enlace desde el inicio de sesión.</p>
                  <Link to="/login" className="text-sm text-emerald-600 hover:text-emerald-700">
                    Volver a iniciar sesión
                  </Link>
                  <p className="text-xs text-gray-400">Ruta esperada en Supabase: {authPath}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}