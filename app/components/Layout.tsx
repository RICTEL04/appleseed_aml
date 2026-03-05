"use client"

import { useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router';
import { LayoutDashboard, Building2, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import Image from 'next/image';
import { NotificationPanel } from './NotificationPanel';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const appSchema = process.env.NEXT_PUBLIC_SUPABASE_APP_SCHEMA ?? 'public';

  const clearLocalSession = () => {
    localStorage.removeItem('appleseed_auth');
    localStorage.removeItem('user_type');
    localStorage.removeItem('organization_id');
    localStorage.removeItem('organization_name');
  };

  useEffect(() => {
    let isMounted = true;
    let isValidating = false;
    let lastValidationAt = 0;

    const validateSession = async () => {
      if (isValidating) {
        return;
      }

      isValidating = true;

      if (!isSupabaseConfigured) {
        const auth = localStorage.getItem('appleseed_auth');
        if (!auth) {
          navigate('/login');
          isValidating = false;
          return;
        }

        isValidating = false;
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const [{ data: sessionData, error: sessionError }, { data: userData, error: userError }] = await Promise.all([
          supabase.auth.getSession(),
          supabase.auth.getUser(),
        ]);

        const activeUser = userData.user ?? sessionData.session?.user;

        if (sessionError || userError || !activeUser) {
          clearLocalSession();
          if (isMounted) {
            navigate('/login');
          }
          return;
        }

        const { data: workerRow, error: workerError } = await supabase
          .schema(appSchema)
          .from('trabajador')
          .select('id_trabajador')
          .eq('id_trabajador', activeUser.id)
          .maybeSingle();

        if (workerError || !workerRow) {
          clearLocalSession();
          if (isMounted) {
            navigate('/login');
          }
          return;
        }

        localStorage.setItem('appleseed_auth', 'true');
        localStorage.setItem('user_type', 'admin');
        localStorage.removeItem('organization_id');
        localStorage.removeItem('organization_name');

      } catch {
        clearLocalSession();
        if (isMounted) {
          navigate('/login');
        }
      } finally {
        isValidating = false;
      }
    };

    const triggerValidation = () => {
      const now = Date.now();

      if (now - lastValidationAt < 5000) {
        return;
      }

      lastValidationAt = now;
      void validateSession();
    };

    void validateSession();

    if (!isSupabaseConfigured) {
      return () => {
        isMounted = false;
      };
    }

    const supabase = getSupabaseClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) {
        return;
      }

      if (event === 'SIGNED_OUT' || !session?.user) {
        clearLocalSession();
        navigate('/login');
      }
    });

    const interactionEvents: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'focus'];
    interactionEvents.forEach((eventName) => {
      window.addEventListener(eventName, triggerValidation, { passive: true });
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerValidation();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      interactionEvents.forEach((eventName) => {
        window.removeEventListener(eventName, triggerValidation);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      authListener.subscription.unsubscribe();
    };
  }, [appSchema, navigate]);

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await getSupabaseClient().auth.signOut();
    }

    clearLocalSession();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-emerald-100 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-[72px]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2.5 rounded-xl border border-transparent hover:border-gray-200 hover:bg-gray-100 transition"
                aria-label={sidebarOpen ? 'Cerrar menú lateral' : 'Abrir menú lateral'}
              >
                <Menu className="w-6 h-6 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-32 sm:w-36">
                  <Image
                    src="/appleseedlogo.png"
                    alt="Logo de Appleseed"
                    width={280}
                    height={96}
                    className="w-full h-auto object-contain"
                    sizes="(max-width: 640px) 8rem, 9rem"
                    priority
                  />
                </div>
                <div>
                  <h1 className="font-semibold text-gray-900 tracking-tight">Appleseed México</h1>
                  <p className="text-xs text-emerald-700/80 uppercase tracking-wide font-medium">Prevención AML</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl border border-transparent hover:border-gray-200 transition"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } fixed top-16 sm:top-[72px] left-0 z-30 w-72 lg:w-64 h-[calc(100vh-4rem)] sm:h-[calc(100vh-72px)] bg-white/95 backdrop-blur-sm border-r border-emerald-100 transition-transform duration-300 ease-in-out`}
        >
          <nav className="p-4 sm:p-5 space-y-2">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500 mb-3">
              Navegación
            </p>
            <Link
              to="/"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                isActive('/')
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/organizations"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                isActive('/organizations') || isActive('/organizations/register')
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Building2 className="w-5 h-5" />
              <span>Organizaciones</span>
            </Link>

            <div className="pt-6 mt-6 border-t border-gray-100 px-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Gestión y seguimiento de cumplimiento para organizaciones registradas.
              </p>
            </div>
          </nav>
        </aside>

        {/* Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/35 backdrop-blur-[1px] z-20 top-16 sm:top-[72px]"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 transition-all duration-300 lg:pl-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}