"use client"

import { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router';
import { LayoutDashboard, Bell, FileText, MessageSquare, LogOut, Menu, User, CircleDollarSign} from 'lucide-react';
import Image from 'next/image';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabase';

export function OrganizationLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState('');

  useEffect(() => {
    const auth = localStorage.getItem('appleseed_auth');
    const userType = localStorage.getItem('user_type');
    const orgName = localStorage.getItem('organization_name');
    
    if (!auth || userType !== 'organization') {
      navigate('/login');
    } else {
      setOrganizationName(orgName || '');
    }
  }, [navigate]);

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await getSupabaseClient().auth.signOut();
    }

    localStorage.removeItem('appleseed_auth');
    localStorage.removeItem('user_type');
    localStorage.removeItem('organization_id');
    localStorage.removeItem('organization_name');
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
                  <h1 className="font-semibold text-gray-900 tracking-tight">{organizationName}</h1>
                  <p className="text-xs text-emerald-700/80 uppercase tracking-wide font-medium">Portal de Organización</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl border border-transparent hover:border-gray-200 transition"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
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
              to="/organization"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                isActive('/organization')
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/organization/donations"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                isActive('/organization/donations')
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <CircleDollarSign className="w-5 h-5" />
              <span>Donaciones</span>
            </Link>

            <Link
              to="/organization/announcements"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                isActive('/organization/announcements')
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Bell className="w-5 h-5" />
              <span>Avisos</span>
            </Link>

            <Link
              to="/organization/documents"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                isActive('/organization/documents')
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Documentos</span>
            </Link>

            <Link
              to="/organization/messages"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                isActive('/organization/messages')
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span>Mensajes</span>
            </Link>

            <Link
              to="/organization/profile"
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${
                isActive('/organization/profile')
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <User className="w-5 h-5" />
              <span>Perfil</span>
            </Link>

            <div className="pt-6 mt-6 border-t border-gray-100 px-3">
              <p className="text-xs text-gray-500 leading-relaxed">
                Panel de gestión para perfil, avisos, documentos y comunicaciones.
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